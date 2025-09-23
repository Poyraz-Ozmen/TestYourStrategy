#!/usr/bin/env python3
import sqlite3

def check_schema():
    conn = sqlite3.connect('dev.db')
    cursor = conn.cursor()

    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    print("Tables in database:")
    for table in tables:
        print(f"  - {table[0]}")

    # Get schema for each table
    for table in tables:
        table_name = table[0]
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        print(f"\nTable '{table_name}' structure:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")

    conn.close()

if __name__ == "__main__":
    check_schema()