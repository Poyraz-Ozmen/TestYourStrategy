#!/usr/bin/env python3
"""
Test script to fetch a few cryptocurrencies and verify the database setup works
"""

import yfinance as yf
import sqlite3
import pandas as pd
from datetime import datetime
import sys
import os

# Database configuration
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prisma', 'dev.db')

# Test with just a few popular cryptos
TEST_CRYPTOS = [
    {'symbol': 'BTC-USD', 'name': 'Bitcoin', 'full_name': 'Bitcoin USD'},
    {'symbol': 'ETH-USD', 'name': 'Ethereum', 'full_name': 'Ethereum USD'},
    {'symbol': 'BNB-USD', 'name': 'BNB', 'full_name': 'BNB USD'},
]

def generate_cuid() -> str:
    """Generate a simple ID"""
    import uuid
    return str(uuid.uuid4()).replace('-', '')

def test_crypto_fetch():
    """Test fetching a few cryptocurrencies"""
    print(f"Testing cryptocurrency fetch with database at: {DATABASE_PATH}")

    try:
        # Add timeout and retry logic for database connection
        import time
        max_retries = 5
        retry_count = 0

        while retry_count < max_retries:
            try:
                conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
                conn.execute('BEGIN IMMEDIATE;')
                conn.rollback()
                break
            except sqlite3.OperationalError as e:
                if "locked" in str(e).lower():
                    retry_count += 1
                    print(f"Database is locked, retrying ({retry_count}/{max_retries})...")
                    time.sleep(2)
                    if retry_count == max_retries:
                        raise
                else:
                    raise

        for crypto in TEST_CRYPTOS:
            print(f"\nTesting {crypto['name']} ({crypto['symbol']})...")

            # Insert cryptocurrency
            crypto_id = generate_cuid()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR IGNORE INTO Cryptocurrency (id, symbol, name, fullName, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                crypto_id,
                crypto['symbol'],
                crypto['name'],
                crypto['full_name'],
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))

            if cursor.rowcount == 0:
                cursor.execute('SELECT id FROM Cryptocurrency WHERE symbol = ?', (crypto['symbol'],))
                result = cursor.fetchone()
                if result:
                    crypto_id = result[0]

            # Fetch yfinance data
            ticker = yf.Ticker(crypto['symbol'])
            hist = ticker.history(period="5d", interval="1d")  # Just 5 days for testing

            if not hist.empty:
                print(f"  Fetched {len(hist)} days of data")

                # Insert a few data points
                hist = hist.reset_index()
                count = 0

                for _, row in hist.iterrows():
                    price_id = generate_cuid()
                    date = row['Date'].strftime('%Y-%m-%d %H:%M:%S')

                    cursor.execute('''
                        INSERT OR REPLACE INTO CryptocurrencyPrice
                        (id, cryptocurrencyId, date, open, high, low, close, volume, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        price_id,
                        crypto_id,
                        date,
                        float(row['Open']),
                        float(row['High']),
                        float(row['Low']),
                        float(row['Close']),
                        float(row['Volume']),
                        datetime.now().isoformat()
                    ))
                    count += 1

                conn.commit()
                print(f"  Successfully stored {count} price records")
            else:
                print(f"  No data available")

        print(f"\nTest completed successfully!")

        # Show what we have in the database
        cursor.execute("SELECT COUNT(*) FROM Cryptocurrency")
        crypto_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM CryptocurrencyPrice")
        price_count = cursor.fetchone()[0]

        print(f"Database now contains: {crypto_count} cryptocurrencies, {price_count} price records")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_crypto_fetch()