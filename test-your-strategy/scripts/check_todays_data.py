#!/usr/bin/env python3
"""
Check today's data in database
"""
import sqlite3
from datetime import datetime

def check_todays_data():
    conn = sqlite3.connect('prisma/dev.db')
    cursor = conn.cursor()

    # Check for today's data
    cursor.execute("""
        SELECT a.symbol, p.date, p.close
        FROM Asset a
        JOIN PriceData p ON a.id = p.assetId
        WHERE a.symbol IN ('AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY')
        AND p.date LIKE '2025-09-22%'
        ORDER BY a.symbol
    """)

    results = cursor.fetchall()

    print("Today's data in database (2025-09-22):")
    if results:
        for symbol, date, close in results:
            print(f"  {symbol}: ${close:.2f}")
    else:
        print("  No data found for 2025-09-22")

        # Check latest data for each stock
        print("\nLatest data for each stock:")
        for symbol in ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY']:
            cursor.execute("""
                SELECT p.date, p.close
                FROM Asset a
                JOIN PriceData p ON a.id = p.assetId
                WHERE a.symbol = ?
                ORDER BY p.date DESC
                LIMIT 1
            """, (symbol,))

            result = cursor.fetchone()
            if result:
                date, close = result
                print(f"  {symbol}: {date} - ${close:.2f}")
            else:
                print(f"  {symbol}: No data found")

    conn.close()

if __name__ == "__main__":
    check_todays_data()