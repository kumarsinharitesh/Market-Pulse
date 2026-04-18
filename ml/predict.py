import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import timedelta

def predict_stock(ticker: str):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="1y")
    if hist.empty:
        raise Exception("Ticker not found or no data")

    hist = hist.reset_index()
    hist['Date'] = pd.to_datetime(hist['Date']).dt.tz_localize(None)
    
    # Feature engineering
    hist['Days'] = (hist['Date'] - hist['Date'].min()).dt.days
    
    X = hist[['Days']].values
    y = hist['Close'].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next 7 days
    last_day = hist['Days'].max()
    future_days = np.array([[last_day + i] for i in range(1, 8)])
    predictions = model.predict(future_days)
    
    last_date = hist['Date'].max()
    future_dates = [(last_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, 8)]
    
    predicted_data = []
    for date, pred in zip(future_dates, predictions):
        predicted_data.append({"Date": date, "Predicted": pred})
        
    trend = "Up" if predictions[-1] > predictions[0] else "Down"
    
    return {
        "ticker": ticker,
        "trend": trend,
        "predictions": predicted_data,
        "current_price": hist['Close'].iloc[-1]
    }
