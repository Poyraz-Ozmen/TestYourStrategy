#!/usr/bin/env python3
"""
Simple test to fetch daily data for a few stocks
"""
import yfinance as yf
from datetime import datetime, timedelta

def test_yfinance():
    """Test yfinance with a few popular stocks"""
    symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']

    print("Testing yfinance API with sample stocks...")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    for symbol in symbols:
        print(f"\nFetching data for {symbol}...")

        try:
            ticker = yf.Ticker(symbol)

            # Get data for the last 5 days to ensure we capture the latest trading day
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5)

            hist = ticker.history(start=start_date, end=end_date, interval='1d')

            if hist.empty:
                print(f"  No data available for {symbol}")
                continue

            print(f"  Found {len(hist)} days of data")

            # Show the latest day's data
            latest_date = hist.index[-1]
            latest_data = hist.iloc[-1]

            print(f"  Latest date: {latest_date.strftime('%Y-%m-%d')}")
            print(f"  Close price: ${latest_data['Close']:.2f}")
            print(f"  Volume: {latest_data['Volume']:,}")

        except Exception as e:
            print(f"  ERROR: {str(e)}")

    print("\nTest completed!")

if __name__ == "__main__":
    test_yfinance()