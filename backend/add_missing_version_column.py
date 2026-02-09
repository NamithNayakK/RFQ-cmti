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
    
    # Check if version column already exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'version'
    """)
    
    if not cur.fetchone():
        # Add the missing version column
        cur.execute("""
            ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
        """)
        print("✓ Added version column to files table")
    else:
        print("⚠ Version column already exists")
    
    conn.commit()
    print("\n✓ Database migration completed successfully!")
    
except psycopg2.Error as e:
    print(f"✗ Database error: {e}")
finally:
    if 'conn' in locals():
        cur.close()
        conn.close()
