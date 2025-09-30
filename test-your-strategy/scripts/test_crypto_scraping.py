#!/usr/bin/env python3
"""
Test script to scrape cryptocurrency symbols from Yahoo Finance
"""

import pandas as pd
import requests
import re
from typing import List, Dict

def test_scrape_crypto_symbols() -> List[Dict[str, str]]:
    """Test scraping Yahoo Finance for cryptocurrency symbols"""
    print("Testing cryptocurrency symbol scraping from Yahoo Finance...")

    try:
        # Start with smaller number for testing
        num_currencies = 500
        url = f"https://finance.yahoo.com/crypto?offset=0&count={num_currencies}"

        print(f"Fetching from: {url}")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        resp = requests.get(url, headers=headers, timeout=15)
        print(f"HTTP Status: {resp.status_code}")

        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code}")

        # Try to parse tables from the response
        from io import StringIO
        tables = pd.read_html(StringIO(resp.text))

        print(f"Found {len(tables)} tables")

        # Get the first table which should contain crypto data
        df = tables[0].copy()
        print(f"Table has {len(df)} rows and columns: {list(df.columns)}")

        # Show first few rows
        print("\nFirst 5 rows:")
        print(df.head())

        # Extract symbols and names if columns exist
        if 'Symbol' in df.columns and 'Name' in df.columns:
            crypto_list = []
            for _, row in df.iterrows():
                symbol = row['Symbol']
                name = row['Name']

                # Clean up the name
                clean_name = re.sub(r'\s*\([^)]*\)', '', str(name)).strip()

                crypto_info = {
                    'symbol': symbol,
                    'name': clean_name,
                    'full_name': str(name)
                }
                crypto_list.append(crypto_info)

            print(f"\nExtracted {len(crypto_list)} cryptocurrencies:")
            for i, crypto in enumerate(crypto_list[:10]):
                print(f"  {i+1}. {crypto['name']} ({crypto['symbol']})")

            return crypto_list
        else:
            print("Could not find Symbol and Name columns")
            return []

    except Exception as e:
        print(f"Error during scraping: {e}")
        return []

if __name__ == "__main__":
    symbols = test_scrape_crypto_symbols()
    print(f"\nTotal symbols found: {len(symbols)}")