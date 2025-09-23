#!/usr/bin/env python3
"""
Daily stock data fetcher using WAL mode for better concurrency
"""
import sqlite3
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import string
import random
import time

# Main stocks to fetch
MAIN_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY']

def connect_with_wal():
    """Connect to database using WAL mode for better concurrency"""
    conn = sqlite3.connect('prisma/dev.db', timeout=30.0)
    # Enable WAL mode for better concurrent access
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA busy_timeout=30000;')  # 30 second timeout
    return conn

def get_asset_id(cursor, symbol):
    """Get asset ID for a given symbol"""
    cursor.execute("SELECT id FROM Asset WHERE symbol = ?", (symbol,))
    result = cursor.fetchone()
    return result[0] if result else None

def generate_price_data_id():
    """Generate a CUID-like ID for price data"""
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"cmfpd{random_part}{timestamp}"

def fetch_stock_data(symbol):
    """Fetch stock data using yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5)

        hist = ticker.history(start=start_date, end=end_date, interval='1d')

        if hist.empty:
            return []

        data_points = []
        for date, row in hist.iterrows():
            if pd.isna(row['Open']) or pd.isna(row['Close']) or pd.isna(row['High']) or pd.isna(row['Low']):
                continue

            data_points.append({
                'date': date.strftime('%Y-%m-%d %H:%M:%S'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume']) if not pd.isna(row['Volume']) else 0
            })

        return data_points

    except Exception as e:
        print(f"  ERROR fetching {symbol}: {str(e)}")
        return []

def update_stock_data(symbol, data_points):
    """Update database with stock data"""
    if not data_points:
        return 0

    try:
        conn = connect_with_wal()
        cursor = conn.cursor()

        # Get asset ID
        asset_id = get_asset_id(cursor, symbol)
        if not asset_id:
            print(f"  WARNING: {symbol} not found in database")
            conn.close()
            return 0

        # Get existing dates
        cursor.execute("SELECT date FROM PriceData WHERE assetId = ?", (asset_id,))
        existing_dates = {row[0] for row in cursor.fetchall()}

        # Filter new data
        new_data = [dp for dp in data_points if dp['date'] not in existing_dates]

        if not new_data:
            print(f"  INFO: No new data for {symbol}")
            conn.close()
            return 0

        # Insert new data
        timestamp = int(datetime.now().timestamp() * 1000)
        inserted = 0

        for dp in new_data:
            try:
                cursor.execute("""
                    INSERT INTO PriceData (id, assetId, date, open, high, low, close, volume, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    generate_price_data_id(),
                    asset_id,
                    dp['date'],
                    dp['open'],
                    dp['high'],
                    dp['low'],
                    dp['close'],
                    dp['volume'],
                    timestamp
                ))
                inserted += 1
            except Exception as e:
                print(f"  ERROR inserting data: {str(e)}")

        conn.commit()
        conn.close()

        if inserted > 0:
            print(f"  SUCCESS: Added {inserted} new data points for {symbol}")

        return inserted

    except Exception as e:
        print(f"  ERROR updating {symbol}: {str(e)}")
        return 0

def main():
    print("Starting WAL-mode daily stock data fetch...")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Fetching data for: {', '.join(MAIN_STOCKS)}")

    total_new = 0

    for symbol in MAIN_STOCKS:
        print(f"\nProcessing {symbol}...")

        # Fetch data
        data_points = fetch_stock_data(symbol)

        if data_points:
            print(f"  Found {len(data_points)} days of data")
            # Update database
            new_count = update_stock_data(symbol, data_points)
            total_new += new_count
        else:
            print(f"  No data available")

        # Small delay between stocks
        time.sleep(0.5)

    print(f"\nSUMMARY: Added {total_new} total new data points")

    if total_new > 0:
        print("Daily data fetch completed successfully!")
    else:
        print("Daily data fetch completed - no new data was available")

if __name__ == "__main__":
    main()