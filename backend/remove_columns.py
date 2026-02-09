import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")

db_params = DATABASE_URL.replace("postgresql://", "").split("@")
user_pass = db_params[0].split(":")
host_db = db_params[1].split("/")
host_port = host_db[0].split(":")

conn = psycopg2.connect(
    dbname=host_db[1],
    user=user_pass[0],
    password=user_pass[1],
    host=host_port[0],
    port=host_port[1] if len(host_port) > 1 else "5432"
)

cursor = conn.cursor()

columns_to_drop = ['version', 'thumbnail_data', 'checksum']

for column in columns_to_drop:
    try:
        cursor.execute(f"""
            ALTER TABLE files DROP COLUMN IF EXISTS {column};
        """)
        print(f"Column '{column}' dropped successfully")
    except Exception as e:
        print(f"Error dropping column '{column}': {e}")
        conn.rollback()

conn.commit()
cursor.close()
conn.close()

print("Database migration completed!")
