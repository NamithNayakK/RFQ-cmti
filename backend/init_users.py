#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv
import sys

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from app.config.database import engine, SessionLocal
from app.models.file_models import Base
from app.models import file_models, notification_models, quote_models, quote_notification_models, user_models
from app.auth import get_password_hash
from app.services.user_service import user_exists

def init_database():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully")

def init_default_users():
    db = SessionLocal()
    
    try:
        default_users = [
            {
                'username': 'buyer',
                'password': 'buyer123',
                'role': 'buyer'
            },
            {
                'username': 'admin',
                'password': 'admin123',
                'role': 'manufacturer'
            }
        ]
        
        for user_data in default_users:
            if not user_exists(db, user_data['username']):
                password_hash = get_password_hash(user_data['password'])
                from app.models.user_models import User
                user = User(
                    username=user_data['username'],
                    password_hash=password_hash,
                    role=user_data['role'],
                    is_active=True
                )
                db.add(user)
                print(f"Added user: {user_data['username']} ({user_data['role']})")
            else:
                print(f"User already exists: {user_data['username']}")
        
        db.commit()
        print("Default users initialized successfully")
    except Exception as e:
        db.rollback()
        print(f"Error initializing users: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    init_default_users()
