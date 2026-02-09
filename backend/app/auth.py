from datetime import datetime, timedelta
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config.settings import AUTH_SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
security = HTTPBearer()
password_context = CryptContext(schemes=["argon2"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def authenticate_user(username: str, password: str, db: Session) -> Optional[dict]:
    from app.services.user_service import authenticate_user_from_db
    return authenticate_user_from_db(db, username, password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    if AUTH_SECRET_KEY == "change-me":
        logger.warning("AUTH_SECRET_KEY is using the default value. Change it in .env.")

    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, AUTH_SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, AUTH_SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if not username or role not in {"buyer", "manufacturer"}:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication")

        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
