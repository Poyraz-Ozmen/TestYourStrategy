#!/usr/bin/env python3
"""
Fetch ALL available cryptocurrency data from yfinance by scraping Yahoo Finance crypto page.
This script dynamically discovers all crypto symbols and fetches their daily OHLCV data.
"""

import yfinance as yf
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import sys
import os
import requests
import time
import re
from typing import List, Dict, Optional

# Database configuration
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prisma', 'dev.db')

def generate_cuid() -> str:
    """Generate a simple ID (not actual CUID but sufficient for our needs)"""
    import uuid
    return str(uuid.uuid4()).replace('-', '')

def get_all_crypto_symbols() -> List[Dict[str, str]]:
    """Scrape Yahoo Finance to get all available cryptocurrency symbols"""
    print("Discovering all available cryptocurrencies from Yahoo Finance...")

    try:
        num_currencies = 1000  # Get up to 1000 cryptos
        url = f"https://finance.yahoo.com/crypto?offset=0&count={num_currencies}"

        print(f"Fetching crypto data from: {url}")

        # Use requests to get the page and pandas to parse tables
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=30)

        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code}: Failed to fetch page")

        # Parse the HTML tables using pandas
        from io import StringIO
        tables = pd.read_html(StringIO(resp.text))
        df = tables[0].copy()

        print(f"Found {len(df)} cryptocurrencies on Yahoo Finance")

        # Extract symbols and names
        crypto_list = []
        for _, row in df.iterrows():
            symbol = str(row['Symbol'])
            name = str(row['Name'])

            # Skip if name is NaN or invalid
            if name in ['nan', 'None', ''] or pd.isna(row['Name']):
                continue

            # Clean up the name (remove extra characters)
            clean_name = re.sub(r'\s*\([^)]*\)', '', name).strip()

            crypto_info = {
                'symbol': symbol,
                'name': clean_name,
                'full_name': name
            }
            crypto_list.append(crypto_info)

        # Sort by market cap (first entries are typically larger market cap)
        print(f"Successfully discovered {len(crypto_list)} cryptocurrencies")
        print("Top 10 cryptocurrencies by market cap:")
        for i, crypto in enumerate(crypto_list[:10]):
            print(f"  {i+1}. {crypto['name']} ({crypto['symbol']})")

        return crypto_list

    except Exception as e:
        print(f"Error scraping Yahoo Finance: {e}")
        print("Falling back to extended list of popular cryptocurrencies...")

        # Extended fallback list if scraping fails
        return [
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
            {'symbol': 'VET-USD', 'name': 'VeChain', 'full_name': 'VeChain'},
            {'symbol': 'FIL-USD', 'name': 'Filecoin', 'full_name': 'Filecoin'},
            {'symbol': 'THETA-USD', 'name': 'Theta Network', 'full_name': 'Theta Network'},
            {'symbol': 'EOS-USD', 'name': 'EOS', 'full_name': 'EOS'},
            {'symbol': 'MANA-USD', 'name': 'Decentraland', 'full_name': 'Decentraland'},
        ]

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
            return False

        # Reset index to get date as a column
        hist = hist.reset_index()

        cursor = conn.cursor()
        inserted_count = 0

        # Insert price data
        for _, row in hist.iterrows():
            price_id = generate_cuid()
            date = row['Date'].strftime('%Y-%m-%d %H:%M:%S')

            # Market cap is not available from yfinance historical data
            market_cap = None

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
                inserted_count += 1

            except Exception as e:
                print(f"Error inserting price data for {crypto_info['symbol']} on {date}: {e}")
                continue

        conn.commit()
        print(f"Successfully stored {inserted_count} days of data for {crypto_info['name']}")
        return True

    except Exception as e:
        print(f"Error fetching data for {crypto_info['symbol']}: {e}")
        conn.rollback()
        return False

def main():
    """Main function to fetch all cryptocurrency data"""
    print("Starting comprehensive cryptocurrency data fetch...")
    print(f"Database path: {DATABASE_PATH}")

    # Get all available crypto symbols
    crypto_list = get_all_crypto_symbols()

    if not crypto_list:
        print("No cryptocurrencies found. Exiting.")
        return

    print(f"\nStarting to fetch data for {len(crypto_list)} cryptocurrencies...")

    # Connect to database
    conn = connect_to_database()

    successful_fetches = 0
    failed_fetches = 0

    try:
        # Process each cryptocurrency
        for i, crypto_info in enumerate(crypto_list, 1):
            print(f"\n[{i}/{len(crypto_list)}] Processing {crypto_info['name']}...")

            # Insert cryptocurrency info
            crypto_id = insert_cryptocurrency(conn, crypto_info)
            if not crypto_id:
                print(f"Failed to insert {crypto_info['symbol']}, skipping...")
                failed_fetches += 1
                continue

            # Fetch and store price data
            success = fetch_and_store_crypto_data(conn, crypto_info, crypto_id)

            if success:
                successful_fetches += 1
            else:
                failed_fetches += 1

            # Add small delay to be respectful to Yahoo Finance
            if i % 10 == 0:  # Every 10 requests
                print("Taking a short break to avoid rate limiting...")
                time.sleep(2)
            else:
                time.sleep(0.5)

        print(f"\n=== SUMMARY ===")
        print(f"Successfully fetched: {successful_fetches} cryptocurrencies")
        print(f"Failed to fetch: {failed_fetches} cryptocurrencies")
        print(f"Total processed: {successful_fetches + failed_fetches}")
        print("Comprehensive cryptocurrency data fetch completed!")

    except KeyboardInterrupt:
        print("\nScript interrupted by user")
        print(f"Processed {successful_fetches + failed_fetches} out of {len(crypto_list)} cryptocurrencies")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()