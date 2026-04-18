from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from textblob import TextBlob
import pandas as pd
from ml.predict import predict_stock
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/py/stock")
def get_stock(ticker: str, period: str = "1mo"):
    """
    Fetch historical OHLCV data for a given ticker and period.
    period: 5d | 1mo | 3mo | 6mo | 1y | 5y
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")

        hist = hist.reset_index()
        hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
        data = hist[['Date', 'Close']].to_dict(orient='records')
        volume_data = (
            hist[['Date', 'Volume']].to_dict(orient='records')
            if 'Volume' in hist.columns else []
        )

        info = stock.info
        current_price = (
            info.get('currentPrice')
            or info.get('regularMarketPrice')
            or float(hist['Close'].iloc[-1])
        )

        return {
            "ticker": ticker,
            "current_price": current_price,
            "history": data,
            "volume": volume_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/quote")
def get_quote(ticker: str):
    """
    Comprehensive real-time quote for a single ticker:
    price, change, change_pct, volume, market cap, P/E, 52-week high/low, etc.
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        hist = stock.history(period="5d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")

        current_price = float(
            info.get('currentPrice')
            or info.get('regularMarketPrice')
            or hist['Close'].iloc[-1]
        )
        prev_close = float(
            info.get('previousClose')
            or (hist['Close'].iloc[-2] if len(hist) > 1 else current_price)
        )

        change = current_price - prev_close
        change_pct = (change / prev_close) * 100 if prev_close != 0 else 0.0

        return {
            "ticker": ticker,
            "name": info.get('longName', ticker),
            "price": round(current_price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": info.get('volume') or 0,
            "avg_volume": info.get('averageVolume') or 0,
            "market_cap": info.get('marketCap') or 0,
            "pe_ratio": info.get('trailingPE'),
            "week_52_high": info.get('fiftyTwoWeekHigh'),
            "week_52_low": info.get('fiftyTwoWeekLow'),
            "open": info.get('open'),
            "day_high": info.get('dayHigh'),
            "day_low": info.get('dayLow'),
            "prev_close": round(prev_close, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/market-overview")
def market_overview():
    """
    Returns live data for major market indices:
    S&P 500, NASDAQ, DOW JONES, VIX — each with a 15-point sparkline.
    """
    try:
        indices = [
            ("^GSPC", "S&P 500"),
            ("^IXIC", "NASDAQ"),
            ("^DJI", "DOW JONES"),
            ("^VIX", "VIX"),
        ]
        result = []
        for idx_ticker, idx_name in indices:
            try:
                t = yf.Ticker(idx_ticker)
                hist = t.history(period="1mo")
                if not hist.empty and len(hist) >= 2:
                    current = float(hist['Close'].iloc[-1])
                    prev = float(hist['Close'].iloc[-2])
                    change_pct = ((current - prev) / prev) * 100 if prev != 0 else 0.0
                    spark = [float(c) for c in hist['Close'].tolist()[-15:]]
                    result.append({
                        "ticker": idx_ticker,
                        "name": idx_name,
                        "price": round(current, 2),
                        "change_pct": round(change_pct, 2),
                        "sparkline": spark,
                    })
            except Exception:
                pass  # skip failed index silently

        return {"indices": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/batch-quote")
def batch_quote(tickers: str):
    """
    Returns basic price quote for a comma-separated list of tickers.
    Used by the real-time ticker marquee on the dashboard.
    """
    try:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
        result = []
        for t in ticker_list:
            try:
                stock = yf.Ticker(t)
                info = stock.info
                hist = stock.history(period="2d")
                if not hist.empty:
                    current = float(
                        info.get('currentPrice')
                        or info.get('regularMarketPrice')
                        or hist['Close'].iloc[-1]
                    )
                    prev = float(
                        info.get('previousClose')
                        or (hist['Close'].iloc[-2] if len(hist) > 1 else current)
                    )
                    change = current - prev
                    change_pct = (change / prev) * 100 if prev != 0 else 0.0
                    result.append({
                        "ticker": t,
                        "price": round(current, 2),
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                    })
            except Exception:
                pass  # skip failed ticker silently

        return {"quotes": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/predict")
def predict(ticker: str):
    try:
        prediction_data = predict_stock(ticker)
        return prediction_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/sentiment")
def sentiment(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        news = stock.news
        if not news:
            return {"sentiment": "Neutral", "score": 0, "news": []}

        total_score = 0
        news_data = []
        for item in news[:7]:
            content_data = item.get('content', {})
            title = content_data.get('title', '') if isinstance(content_data, dict) else item.get('title', '')
            if not title:
                continue
            analysis = TextBlob(title)
            score = analysis.sentiment.polarity
            total_score += score

            sentiment_label = "Neutral"
            if score > 0.1:
                sentiment_label = "Positive"
            elif score < -0.1:
                sentiment_label = "Negative"

            link = ''
            if isinstance(content_data, dict):
                link = content_data.get('canonicalUrl', {}).get('url', '') if isinstance(content_data.get('canonicalUrl'), dict) else item.get('link', '')
            
            publisher = ''
            if isinstance(content_data, dict):
                pub_data = content_data.get('provider', {})
                publisher = pub_data.get('displayName', '') if isinstance(pub_data, dict) else item.get('publisher', 'Unknown')

            news_data.append({
                "title": title,
                "publisher": publisher or item.get('publisher', 'Unknown'),
                "link": link or item.get('link', ''),
                "sentiment": sentiment_label,
            })

        avg_score = total_score / len(news_data) if news_data else 0
        overall_sentiment = "Neutral"
        if avg_score > 0.1:
            overall_sentiment = "Positive"
        elif avg_score < -0.1:
            overall_sentiment = "Negative"

        return {
            "sentiment": overall_sentiment,
            "score": round(avg_score, 3),
            "news": news_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/recommendation")
def recommendation(ticker: str):
    try:
        pred = predict_stock(ticker)
        sent = sentiment(ticker)

        trend = pred.get('trend', 'Hold')
        overall_sentiment = sent.get('sentiment', 'Neutral')

        action = "HOLD"
        confidence = 50

        if trend == "Up" and overall_sentiment == "Positive":
            action = "BUY"
            confidence = 85
        elif trend == "Down" and overall_sentiment == "Negative":
            action = "SELL"
            confidence = 80
        elif trend == "Up":
            action = "BUY"
            confidence = 65
        elif trend == "Down":
            action = "SELL"
            confidence = 60

        return {
            "action": action,
            "confidence": confidence,
            "ticker": ticker,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
