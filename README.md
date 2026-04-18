# Market Pulse 📈

Market Pulse is an AI-based full-stack web application for stock prediction and sentiment analysis. It provides users with:
- Real-time stock data fetching.
- AI predictions for the next 7 days based on Linear Regression models.
- Sentiment analysis from latest stock news using NLP.
- Smart Buy/Hold/Sell recommendations based on price trend & sentiment.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS, Shadcn UI, Recharts, Framer Motion
- **Backend/ML**: Python, FastAPI, yfinance, scikit-learn, TextBlob, Pandas, Numpy

## Quick Start

You only need one command to install everything (Node.js & Python dependencies) and start the development servers concurrently.

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.8+ recommended)

### 1. Install & Run
```bash
npm install
npm run dev
```

### 2. Access the Application
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

*(The Python ML server will automatically start on port 5328 in the background and Next.js will proxy requests to it.)*

## Architecture

- `app/` & `components/` - Next.js frontend code
- `ml/` - Python FastAPI backend and Machine Learning scripts
- `setup_env.js` - Automated setup script for Python Virtual Environment run during `npm install`
