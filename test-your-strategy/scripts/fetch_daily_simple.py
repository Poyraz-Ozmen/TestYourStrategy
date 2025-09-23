#!/usr/bin/env python3
"""
Simple daily stock data fetcher - works with main stocks only
"""
import sqlite3
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import sys
import string
import random
import time

# We'll fetch all stocks from the database instead of a fixed list

def wait_for_database(db_path, max_retries=10):
    """Wait for database to become available"""
    for i in range(max_retries):
        try:
            conn = sqlite3.connect(db_path, timeout=10.0)
            conn.execute("SELECT 1")
            return conn
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                print(f"Database locked, waiting... (attempt {i+1}/{max_retries})")
                time.sleep(2)
                continue
            else:
                raise e
    raise Exception("Database remained locked after all retries")

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

def fetch_and_update_stock(cursor, symbol):
    """Fetch and update data for a single stock"""
    print(f"Processing {symbol}...")

    try:
        # Get asset ID
        asset_id = get_asset_id(cursor, symbol)
        if not asset_id:
            print(f"  WARNING: {symbol} not found in database")
            return 0

        # Fetch data using yfinance
        ticker = yf.Ticker(symbol)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5)

        hist = ticker.history(start=start_date, end=end_date, interval='1d')

        if hist.empty:
            print(f"  WARNING: No data available for {symbol}")
            return 0

        # Get existing dates to avoid duplicates
        cursor.execute("SELECT date FROM PriceData WHERE assetId = ?", (asset_id,))
        existing_dates = {row[0] for row in cursor.fetchall()}

        # Process data
        new_count = 0
        timestamp = int(datetime.now().timestamp() * 1000)

        for date, row in hist.iterrows():
            date_str = date.strftime('%Y-%m-%d %H:%M:%S')

            if date_str in existing_dates:
                continue

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
                    date_str,
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                    timestamp
                ))
                new_count += 1
            except Exception as e:
                print(f"  ERROR inserting {date_str}: {str(e)}")

        if new_count > 0:
            print(f"  SUCCESS: Added {new_count} new data points")
        else:
            print(f"  INFO: No new data to add")

        return new_count

    except Exception as e:
        print(f"  ERROR: Failed to process {symbol}: {str(e)}")
        return 0

def get_all_stock_symbols(cursor):
    """Get all stock symbols from the database"""
    cursor.execute("SELECT DISTINCT symbol FROM Asset WHERE type = 'STOCK' ORDER BY symbol")
    return [row[0] for row in cursor.fetchall()]

def main():
    print("Starting daily stock data fetch for ALL stocks in database...")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        # Connect to database with retries
        conn = wait_for_database('prisma/dev.db')
        cursor = conn.cursor()
        print("Connected to database successfully")

        # Get all stock symbols
        all_stocks = get_all_stock_symbols(cursor)
        print(f"Found {len(all_stocks)} stocks in database")

        if not all_stocks:
            print("No stocks found in database")
            return 0

        total_new = 0
        successful_updates = 0
        failed_updates = 0

        # Process each stock
        for i, stock in enumerate(all_stocks, 1):
            print(f"[{i}/{len(all_stocks)}] Processing {stock}...")

            try:
                new_count = fetch_and_update_stock(cursor, stock)
                total_new += new_count

                if new_count >= 0:  # Success (even if 0 new records)
                    successful_updates += 1
                else:
                    failed_updates += 1

                conn.commit()  # Commit after each stock

                # Small delay between stocks to be nice to APIs
                if i % 10 == 0:
                    print(f"  Processed {i} stocks, taking a short break...")
                    time.sleep(2)
                else:
                    time.sleep(0.1)

            except Exception as e:
                print(f"  ERROR processing {stock}: {str(e)}")
                failed_updates += 1

        print(f"\n" + "="*60)
        print("DAILY DATA FETCH SUMMARY")
        print("="*60)
        print(f"Total stocks processed: {len(all_stocks)}")
        print(f"Successful updates: {successful_updates}")
        print(f"Failed updates: {failed_updates}")
        print(f"Total new data points added: {total_new}")
        print("="*60)

        if total_new > 0:
            print("Daily data fetch completed successfully!")
        else:
            print("Daily data fetch completed - no new data was available")

    except Exception as e:
        print(f"ERROR: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        return 1
    finally:
        if 'conn' in locals():
            conn.close()

    return 0

if __name__ == "__main__":
    sys.exit(main())