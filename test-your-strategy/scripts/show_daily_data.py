#!/usr/bin/env python3
"""
Show current daily data for stocks (without database operations)
"""
import yfinance as yf
from datetime import datetime, timedelta

# Main stocks to check
STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY', 'BTC-USD', 'ETH-USD']

def show_current_data():
    print("Current Stock & Crypto Data")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    for symbol in STOCKS:
        print(f"\n{symbol}:")
        try:
            ticker = yf.Ticker(symbol)

            # Get last 2 days to ensure we have the latest
            end_date = datetime.now()
            start_date = end_date - timedelta(days=2)

            hist = ticker.history(start=start_date, end=end_date, interval='1d')

            if hist.empty:
                print("  No data available")
                continue

            # Get the latest data
            latest = hist.iloc[-1]
            latest_date = hist.index[-1]

            print(f"  Date: {latest_date.strftime('%Y-%m-%d')}")
            print(f"  Open:  ${latest['Open']:.2f}")
            print(f"  High:  ${latest['High']:.2f}")
            print(f"  Low:   ${latest['Low']:.2f}")
            print(f"  Close: ${latest['Close']:.2f}")
            print(f"  Volume: {latest['Volume']:,.0f}")

            # Calculate daily change
            if len(hist) > 1:
                prev_close = hist.iloc[-2]['Close']
                change = latest['Close'] - prev_close
                change_pct = (change / prev_close) * 100
                print(f"  Change: ${change:+.2f} ({change_pct:+.2f}%)")

        except Exception as e:
            print(f"  ERROR: {str(e)}")

    print("\n" + "=" * 60)
    print("Data provided by Yahoo Finance via yfinance")

if __name__ == "__main__":
    show_current_data()