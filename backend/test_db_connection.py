import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing database connection...")

try:
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME", "filedb"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "nnk123"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432")
    )
    print("✓ Database connection successful")
    
    cur = conn.cursor()
    
    # Check if files table exists
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'files'
    """)
    
    if cur.fetchone():
        print("✓ Files table exists")
        
        # Check columns in files table
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'files'
            ORDER BY ordinal_position
        """)
        
        columns = cur.fetchall()
        print(f"✓ Files table has {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
            
        # Check if version column exists
        version_exists = any(col[0] == 'version' for col in columns)
        if version_exists:
            print("✓ Version column exists")
        else:
            print("✗ Version column missing - adding it...")
            cur.execute("ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1 NOT NULL")
            conn.commit()
            print("✓ Version column added")
    else:
        print("✗ Files table does not exist")
    
    conn.close()
    print("Database test completed successfully")
    
except Exception as e:
    print(f"✗ Database error: {e}")
    import traceback
    traceback.print_exc()
