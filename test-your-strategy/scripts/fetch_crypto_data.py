#!/usr/bin/env python3
"""
Fetch cryptocurrency data from yfinance and store in database.
This script fetches daily OHLCV data for popular cryptocurrencies.
"""

import yfinance as yf
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import sys
import os
from typing import List, Dict, Optional

# Database configuration
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prisma', 'dev.db')

# List of popular cryptocurrencies available on Yahoo Finance
CRYPTOCURRENCIES = [
    {'symbol': 'BTC-USD', 'name': 'Bitcoin', 'full_name': 'Bitcoin'},
    {'symbol': 'ETH-USD', 'name': 'Ethereum', 'full_name': 'Ethereum'},
    {'symbol': 'BNB-USD', 'name': 'BNB', 'full_name': 'BNB'},
    {'symbol': 'XRP-USD', 'name': 'XRP', 'full_name': 'XRP'},
    {'symbol': 'ADA-USD', 'name': 'Cardano', 'full_name': 'Cardano'},
    {'symbol': 'DOGE-USD', 'name': 'Dogecoin', 'full_name': 'Dogecoin'},
    {'symbol': 'SOL-USD', 'name': 'Solana', 'full_name': 'Solana'},
    {'symbol': 'TRX-USD', 'name': 'TRON', 'full_name': 'TRON'},
    {'symbol': 'MATIC-USD', 'name': 'Polygon', 'full_name': 'Polygon'},
    {'symbol': 'LTC-USD', 'name': 'Litecoin', 'full_name': 'Litecoin'},
    {'symbol': 'AVAX-USD', 'name': 'Avalanche', 'full_name': 'Avalanche'},
    {'symbol': 'SHIB-USD', 'name': 'Shiba Inu', 'full_name': 'Shiba Inu'},
    {'symbol': 'DOT-USD', 'name': 'Polkadot', 'full_name': 'Polkadot'},
    {'symbol': 'UNI-USD', 'name': 'Uniswap', 'full_name': 'Uniswap'},
    {'symbol': 'ATOM-USD', 'name': 'Cosmos', 'full_name': 'Cosmos'},
    {'symbol': 'LINK-USD', 'name': 'Chainlink', 'full_name': 'Chainlink'},
    {'symbol': 'BCH-USD', 'name': 'Bitcoin Cash', 'full_name': 'Bitcoin Cash'},
    {'symbol': 'ETC-USD', 'name': 'Ethereum Classic', 'full_name': 'Ethereum Classic'},
    {'symbol': 'XLM-USD', 'name': 'Stellar', 'full_name': 'Stellar'},
    {'symbol': 'ALGO-USD', 'name': 'Algorand', 'full_name': 'Algorand'},
]

def generate_cuid() -> str:
    """Generate a simple ID (not actual CUID but sufficient for our needs)"""
    import uuid
    return str(uuid.uuid4()).replace('-', '')

def connect_to_database() -> sqlite3.Connection:
    """Connect to the SQLite database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def insert_cryptocurrency(conn: sqlite3.Connection, crypto_info: Dict) -> str:
    """Insert cryptocurrency info into database and return the ID"""
    cursor = conn.cursor()
    crypto_id = generate_cuid()

    try:
        cursor.execute('''
            INSERT OR IGNORE INTO Cryptocurrency (id, symbol, name, fullName, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            crypto_id,
            crypto_info['symbol'],
            crypto_info['name'],
            crypto_info['full_name'],
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))

        # If insert was ignored (already exists), get the existing ID
        if cursor.rowcount == 0:
            cursor.execute('SELECT id FROM Cryptocurrency WHERE symbol = ?', (crypto_info['symbol'],))
            result = cursor.fetchone()
            if result:
                crypto_id = result[0]

        conn.commit()
        return crypto_id

    except Exception as e:
        print(f"Error inserting cryptocurrency {crypto_info['symbol']}: {e}")
        conn.rollback()
        return None

def fetch_and_store_crypto_data(conn: sqlite3.Connection, crypto_info: Dict, crypto_id: str, period: str = "2y"):
    """Fetch cryptocurrency data from yfinance and store in database"""

    print(f"Fetching data for {crypto_info['name']} ({crypto_info['symbol']})...")

    try:
        # Fetch data from yfinance
        ticker = yf.Ticker(crypto_info['symbol'])
        hist = ticker.history(period=period, interval="1d")

        if hist.empty:
            print(f"No data available for {crypto_info['symbol']}")
            return

        # Reset index to get date as a column
        hist = hist.reset_index()

        cursor = conn.cursor()

        # Insert price data
        for _, row in hist.iterrows():
            price_id = generate_cuid()
            date = row['Date'].strftime('%Y-%m-%d %H:%M:%S')

            # Calculate market cap (approximate using close price * volume)
            # Note: This is not accurate market cap, just a placeholder
            # Real market cap would need circulating supply data
            market_cap = None  # We'll leave this as NULL for now

            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO CryptocurrencyPrice
                    (id, cryptocurrencyId, date, open, high, low, close, volume, marketCap, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    price_id,
                    crypto_id,
                    date,
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    float(row['Volume']),
                    market_cap,
                    datetime.now().isoformat()
                ))

            except Exception as e:
                print(f"Error inserting price data for {crypto_info['symbol']} on {date}: {e}")
                continue

        conn.commit()
        print(f"Successfully stored {len(hist)} days of data for {crypto_info['name']}")

    except Exception as e:
        print(f"Error fetching data for {crypto_info['symbol']}: {e}")
        conn.rollback()

def main():
    """Main function to fetch all cryptocurrency data"""
    print("Starting cryptocurrency data fetch...")
    print(f"Database path: {DATABASE_PATH}")

    # Connect to database
    conn = connect_to_database()

    try:
        # Process each cryptocurrency
        for crypto_info in CRYPTOCURRENCIES:
            # Insert cryptocurrency info
            crypto_id = insert_cryptocurrency(conn, crypto_info)
            if not crypto_id:
                print(f"Failed to insert {crypto_info['symbol']}, skipping...")
                continue

            # Fetch and store price data
            fetch_and_store_crypto_data(conn, crypto_info, crypto_id)
            print()  # Empty line for better readability

        print("Cryptocurrency data fetch completed successfully!")

    except KeyboardInterrupt:
        print("\nScript interrupted by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()