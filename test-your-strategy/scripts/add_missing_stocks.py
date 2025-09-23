#!/usr/bin/env python3
"""
Add missing stocks to database and fetch their data
"""
import sqlite3
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import string
import random

# Stocks to add
MISSING_STOCKS = [
    {'symbol': 'TSLA', 'name': 'Tesla Inc.'},
    {'symbol': 'SPY', 'name': 'SPDR S&P 500 ETF Trust'}
]

def generate_asset_id():
    """Generate a CUID-like ID for asset"""
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"cmfuz{random_part}{timestamp}"

def generate_price_data_id():
    """Generate a CUID-like ID for price data"""
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"cmfpd{random_part}{timestamp}"

def add_stock_to_database(cursor, symbol, name):
    """Add a stock to the database"""

    # Check if stock already exists
    cursor.execute("SELECT id FROM Asset WHERE symbol = ?", (symbol,))
    if cursor.fetchone():
        print(f"  {symbol} already exists in database")
        return cursor.execute("SELECT id FROM Asset WHERE symbol = ?", (symbol,)).fetchone()[0]

    # Generate asset ID
    asset_id = generate_asset_id()
    timestamp = int(datetime.now().timestamp() * 1000)

    # Insert new asset
    cursor.execute("""
        INSERT INTO Asset (id, symbol, name, type, exchange, createdAt, updatedAt)
        VALUES (?, ?, ?, 'STOCK', 'NASDAQ', ?, ?)
    """, (asset_id, symbol, name, timestamp, timestamp))

    print(f"  Added {symbol} ({name}) to database")
    return asset_id

def fetch_and_store_data(cursor, asset_id, symbol):
    """Fetch and store historical data for a stock"""
    try:
        print(f"  Fetching data for {symbol}...")

        ticker = yf.Ticker(symbol)

        # Get the last 2 years of data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)  # ~2 years

        hist = ticker.history(start=start_date, end=end_date, interval='1d')

        if hist.empty:
            print(f"    No data available for {symbol}")
            return 0

        print(f"    Found {len(hist)} days of data")

        # Insert data
        timestamp = int(datetime.now().timestamp() * 1000)
        inserted = 0

        for date, row in hist.iterrows():
            # Skip if any critical values are NaN
            if pd.isna(row['Open']) or pd.isna(row['Close']) or pd.isna(row['High']) or pd.isna(row['Low']):
                continue

            try:
                cursor.execute("""
                    INSERT INTO PriceData (id, assetId, date, open, high, low, close, volume, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    generate_price_data_id(),
                    asset_id,
                    date.strftime('%Y-%m-%d %H:%M:%S'),
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                    timestamp
                ))
                inserted += 1
            except Exception as e:
                print(f"    ERROR inserting data point: {str(e)}")

        print(f"    Inserted {inserted} data points")
        return inserted

    except Exception as e:
        print(f"    ERROR fetching data for {symbol}: {str(e)}")
        return 0

def main():
    print("Adding missing stocks and fetching their data...")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        conn = sqlite3.connect('prisma/dev.db', timeout=30.0)
        cursor = conn.cursor()

        total_inserted = 0

        for stock in MISSING_STOCKS:
            symbol = stock['symbol']
            name = stock['name']

            print(f"\nProcessing {symbol}...")

            # Add stock to database
            asset_id = add_stock_to_database(cursor, symbol, name)

            # Fetch and store data
            inserted = fetch_and_store_data(cursor, asset_id, symbol)
            total_inserted += inserted

            # Commit after each stock
            conn.commit()

        print(f"\nSUMMARY:")
        print(f"Total data points inserted: {total_inserted}")
        print("Missing stocks have been added successfully!")

    except Exception as e:
        print(f"ERROR: {str(e)}")
        conn.rollback()
        return 1
    finally:
        conn.close()

    return 0

if __name__ == "__main__":
    main()