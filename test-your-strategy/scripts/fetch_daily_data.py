#!/usr/bin/env python3
"""
Daily Stock Data Fetcher using yfinance
Fetches today's stock data for all symbols in the database
"""
import sqlite3
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import sys
import string
import random

def get_all_stock_symbols(cursor):
    """Get all stock symbols from the database"""
    cursor.execute("SELECT DISTINCT symbol FROM Asset WHERE type = 'STOCK'")
    return [row[0] for row in cursor.fetchall()]

def get_asset_id(cursor, symbol):
    """Get asset ID for a given symbol"""
    cursor.execute("SELECT id FROM Asset WHERE symbol = ?", (symbol,))
    result = cursor.fetchone()
    return result[0] if result else None

def generate_price_data_id():
    """Generate a CUID-like ID for price data (similar to Prisma's format)"""
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"cmfpd{random_part}{timestamp}"

def fetch_daily_data_for_symbol(symbol, days_back=5):
    """
    Fetch recent daily data for a symbol using yfinance
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        days_back: Number of days back to fetch (default 5 to ensure we get the latest trading day)
    """
    try:
        ticker = yf.Ticker(symbol)

        # Get data for the last few days to ensure we capture the latest trading day
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        # Fetch the data
        hist = ticker.history(start=start_date, end=end_date, interval='1d')

        if hist.empty:
            print(f"  WARNING: No data available for {symbol}")
            return []

        # Convert to our format
        data_points = []
        for date, row in hist.iterrows():
            # Skip if any critical values are NaN
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
        print(f"  ERROR: Error fetching data for {symbol}: {str(e)}")
        return []

def update_daily_data(cursor, symbol, data_points):
    """Update database with new daily data"""
    if not data_points:
        return 0

    asset_id = get_asset_id(cursor, symbol)
    if not asset_id:
        print(f"  WARNING: Asset {symbol} not found in database")
        return 0

    # Get existing dates for this asset to avoid duplicates
    cursor.execute("SELECT date FROM PriceData WHERE assetId = ?", (asset_id,))
    existing_dates = {row[0] for row in cursor.fetchall()}

    # Filter out dates that already exist
    new_data_points = [dp for dp in data_points if dp['date'] not in existing_dates]

    if not new_data_points:
        print(f"  INFO: No new data points for {symbol}")
        return 0

    # Insert new data points
    timestamp = int(datetime.now().timestamp() * 1000)
    inserted_count = 0

    for data_point in new_data_points:
        try:
            cursor.execute("""
                INSERT INTO PriceData (id, assetId, date, open, high, low, close, volume, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                generate_price_data_id(),
                asset_id,
                data_point['date'],
                data_point['open'],
                data_point['high'],
                data_point['low'],
                data_point['close'],
                data_point['volume'],
                timestamp
            ))
            inserted_count += 1
        except Exception as e:
            print(f"  ERROR: Error inserting data point for {symbol}: {str(e)}")

    return inserted_count

def main():
    print("Starting daily stock data fetch using yfinance...")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Connect to database
    try:
        conn = sqlite3.connect('prisma/dev.db')
        cursor = conn.cursor()
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {str(e)}")
        return

    try:
        # Get all stock symbols
        symbols = get_all_stock_symbols(cursor)
        print(f"Found {len(symbols)} stock symbols in database")

        if not symbols:
            print("WARNING: No stock symbols found in database")
            return

        total_inserted = 0
        successful_updates = 0
        failed_updates = 0

        # Process each symbol
        for i, symbol in enumerate(symbols, 1):
            print(f"[{i}/{len(symbols)}] Processing {symbol}...")

            try:
                # Fetch data
                data_points = fetch_daily_data_for_symbol(symbol)

                if data_points:
                    # Update database
                    inserted = update_daily_data(cursor, symbol, data_points)
                    total_inserted += inserted

                    if inserted > 0:
                        print(f"  SUCCESS: Added {inserted} new data points")
                        successful_updates += 1
                    else:
                        print(f"  INFO: No new data to add")
                        successful_updates += 1
                else:
                    print(f"  WARNING: No data received")
                    failed_updates += 1

                # Commit every 10 symbols to avoid losing progress
                if i % 10 == 0:
                    conn.commit()
                    print(f"  COMMITTED: Batch at symbol {i}")

            except Exception as e:
                print(f"  ERROR: Failed to process {symbol}: {str(e)}")
                failed_updates += 1

        # Final commit
        conn.commit()

        # Summary
        print("\n" + "="*60)
        print("DAILY DATA FETCH SUMMARY")
        print("="*60)
        print(f"Total symbols processed: {len(symbols)}")
        print(f"Successful updates: {successful_updates}")
        print(f"Failed updates: {failed_updates}")
        print(f"Total new data points added: {total_inserted}")
        print("="*60)

        if total_inserted > 0:
            print("Daily data fetch completed successfully!")
        else:
            print("Daily data fetch completed - no new data was available")

    except Exception as e:
        print(f"ERROR: Fatal error during data fetch: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()