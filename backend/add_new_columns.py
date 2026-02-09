#!/usr/bin/env python3
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "nnk123")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "filedb")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    cur = conn.cursor()
    
    columns_to_add = [
        ("version", "INTEGER DEFAULT 1 NOT NULL"),
        ("material", "VARCHAR"),
        ("part_number", "VARCHAR"),
        ("quantity_unit", "VARCHAR DEFAULT 'pieces'")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cur.execute(f"""
                ALTER TABLE files ADD COLUMN {col_name} {col_type};
            """)
            print(f"✓ Added column: {col_name}")
        except psycopg2.Error as e:
            if "already exists" in str(e):
                print(f"⚠ Column {col_name} already exists")
            else:
                print(f"✗ Error adding {col_name}: {e}")
    
    conn.commit()
    print("\n✓ Database migration completed successfully!")
    
except psycopg2.Error as e:
    print(f"✗ Database connection error: {e}")
finally:
    if conn:
        cur.close()
        conn.close()
