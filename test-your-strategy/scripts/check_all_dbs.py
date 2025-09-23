#!/usr/bin/env python3
import sqlite3
import os

def check_database(db_path):
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist")
        return

    print(f"\n=== Checking database: {db_path} ===")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        print(f"Tables found: {len(tables)}")
        for table in tables:
            table_name = table[0]
            print(f"  - {table_name}")

            # Get count of records in each table
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"    Records: {count}")
            except Exception as e:
                print(f"    Error counting records: {e}")

        # If we have Asset table, show some sample data
        if any('Asset' in table[0] for table in tables):
            asset_table = next(table[0] for table in tables if 'Asset' in table[0])
            print(f"\nSample data from {asset_table}:")
            cursor.execute(f"SELECT * FROM {asset_table} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                print(f"  {row}")

        conn.close()

    except Exception as e:
        print(f"Error accessing database: {e}")

def main():
    # Check both potential database locations
    check_database('dev.db')
    check_database('prisma/dev.db')

if __name__ == "__main__":
    main()