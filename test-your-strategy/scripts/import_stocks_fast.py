#!/usr/bin/env python3
import sqlite3
import pandas as pd
import os
import glob
from datetime import datetime
import sys

def get_or_create_asset(cursor, symbol):
    """Get asset ID or create new asset if it doesn't exist"""
    cursor.execute("SELECT id FROM Asset WHERE symbol = ?", (symbol,))
    result = cursor.fetchone()

    if result:
        return result[0]

    # Generate a CUID-like ID for the asset (similar to Prisma's format)
    import random
    import string
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    asset_id = f"cmfuz{random_part}{timestamp}"

    cursor.execute("""
        INSERT INTO Asset (id, symbol, name, type, exchange, createdAt, updatedAt)
        VALUES (?, ?, ?, 'STOCK', 'NASDAQ', ?, ?)
    """, (asset_id, symbol, symbol, timestamp, timestamp))

    return asset_id

def import_csv_file(csv_path, cursor):
    """Import a single CSV file into the database"""
    try:
        # Extract symbol from filename
        symbol = os.path.basename(csv_path).replace('.csv', '')

        print(f"Processing {symbol}...")

        # Get or create asset
        asset_id = get_or_create_asset(cursor, symbol)

        # Read CSV with pandas
        df = pd.read_csv(csv_path)

        # Rename columns to match database schema
        df = df.rename(columns={
            'Date': 'date',
            'Open': 'open',
            'High': 'high',
            'Low': 'low',
            'Close': 'close',
            'Volume': 'volume'
        })

        # Convert date column to proper format
        df['date'] = pd.to_datetime(df['date'])

        # Check for existing records to avoid duplicates
        existing_dates = set()
        cursor.execute("SELECT date FROM PriceData WHERE assetId = ?", (asset_id,))
        for row in cursor.fetchall():
            existing_dates.add(row[0])

        # Filter out existing dates
        if existing_dates:
            # Convert existing dates to same format for comparison
            existing_date_strings = {str(date) for date in existing_dates}
            df = df[~df['date'].dt.strftime('%Y-%m-%d %H:%M:%S').isin(existing_date_strings)]

        if len(df) == 0:
            print(f"  {symbol}: No new records to import")
            return 0

        # Add asset_id and generated id columns
        df['assetId'] = asset_id
        import random
        import string
        timestamp = int(datetime.now().timestamp() * 1000)
        df['id'] = [f"cmfpd{random.choice(string.ascii_lowercase)}{timestamp}{i:06d}" for i in range(len(df))]
        df['createdAt'] = timestamp

        # Convert date to timestamp format
        df['date'] = df['date'].dt.strftime('%Y-%m-%d %H:%M:%S')

        # Reorder columns to match database schema
        df = df[['id', 'assetId', 'date', 'open', 'high', 'low', 'close', 'volume', 'createdAt']]

        # Use pandas to_sql for fast bulk insert with smaller chunks to avoid SQL variable limits
        chunksize = 500  # Smaller chunks to avoid SQLite variable limits
        df.to_sql('PriceData', cursor.connection, if_exists='append', index=False, method='multi', chunksize=chunksize)

        print(f"  {symbol}: Imported {len(df)} records")
        return len(df)

    except Exception as e:
        print(f"  ERROR importing {symbol}: {str(e)}")
        return 0

def main():
    print("Starting fast Python import of stock CSV files...")

    # Connect to SQLite database (Prisma database location)
    conn = sqlite3.connect('prisma/dev.db')
    cursor = conn.cursor()

    # Get list of already imported symbols to skip them
    cursor.execute("SELECT symbol FROM Asset")
    imported_symbols = {row[0] for row in cursor.fetchall()}
    print(f"Found {len(imported_symbols)} already imported symbols")

    # Get list of CSV files (excluding already imported ones)
    csv_files = glob.glob('public/stocks/*.csv')
    csv_files = [f for f in csv_files if os.path.basename(f).replace('.csv', '') not in imported_symbols]

    print(f"Found {len(csv_files)} CSV files to import (skipping {len(imported_symbols)} already imported)")

    total_imported = 0
    successful_files = 0
    failed_files = 0

    try:
        for i, csv_file in enumerate(csv_files, 1):
            print(f"[{i}/{len(csv_files)}] Processing {os.path.basename(csv_file)}")

            try:
                imported = import_csv_file(csv_file, cursor)
                total_imported += imported
                successful_files += 1

                # Commit every 50 files to avoid huge transactions
                if i % 50 == 0:
                    conn.commit()
                    print(f"  Committed batch at file {i}")

            except Exception as e:
                print(f"  FAILED: {str(e)}")
                failed_files += 1

        # Final commit
        conn.commit()

        print("\n" + "="*60)
        print("IMPORT SUMMARY")
        print("="*60)
        print(f"Total files processed: {len(csv_files)}")
        print(f"Successful imports: {successful_files}")
        print(f"Failed imports: {failed_files}")
        print(f"Total records imported: {total_imported:,}")
        print("="*60)

    except KeyboardInterrupt:
        print("\nImport interrupted by user")
        conn.rollback()
    except Exception as e:
        print(f"\nImport failed: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()