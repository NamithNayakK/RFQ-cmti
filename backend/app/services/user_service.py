from sqlalchemy.orm import Session
from app.models.user_models import User
from app.auth import get_password_hash, verify_password
from typing import Optional


def create_user(db: Session, username: str, password: str, role: str):
    password_hash = get_password_hash(password)
    user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def authenticate_user_from_db(db: Session, username: str, password: str) -> Optional[dict]:
    user = get_user_by_username(db, username)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return {
        "username": user.username,
        "role": user.role,
        "user_id": user.id
    }


def user_exists(db: Session, username: str) -> bool:
    return db.query(User).filter(User.username == username).first() is not None
