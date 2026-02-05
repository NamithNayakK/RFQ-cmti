from datetime import datetime, timedelta
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config.settings import (
    AUTH_USERNAME,
    AUTH_PASSWORD,
    AUTH_PASSWORD_HASH,
    BUYER_USERNAME,
    BUYER_PASSWORD,
    BUYER_PASSWORD_HASH,
    MANUFACTURER_USERNAME,
    MANUFACTURER_PASSWORD,
    MANUFACTURER_PASSWORD_HASH,
    AUTH_SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
security = HTTPBearer()
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def _verify_user_password(plain_password: str, hashed_password: Optional[str], raw_password: Optional[str]) -> bool:
    if hashed_password:
        return verify_password(plain_password, hashed_password)
    if raw_password:
        return plain_password == raw_password
    return False


def _get_buyer_username() -> Optional[str]:
    return BUYER_USERNAME or AUTH_USERNAME


def _get_buyer_password() -> Optional[str]:
    return BUYER_PASSWORD or AUTH_PASSWORD


def _get_buyer_password_hash() -> Optional[str]:
    return BUYER_PASSWORD_HASH or AUTH_PASSWORD_HASH


def authenticate_user(username: str, password: str) -> Optional[dict]:
    buyer_username = _get_buyer_username()
    if buyer_username and username == buyer_username:
        if _verify_user_password(password, _get_buyer_password_hash(), _get_buyer_password()):
            return {"username": username, "role": "buyer"}

    if MANUFACTURER_USERNAME and username == MANUFACTURER_USERNAME:
        if _verify_user_password(password, MANUFACTURER_PASSWORD_HASH, MANUFACTURER_PASSWORD):
            return {"username": username, "role": "manufacturer"}

    if not buyer_username and not MANUFACTURER_USERNAME:
        logger.error("No authentication users configured")

    return None


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

        if role == "buyer":
            expected_username = _get_buyer_username()
            if not expected_username or username != expected_username:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication")

        if role == "manufacturer":
            if not MANUFACTURER_USERNAME or username != MANUFACTURER_USERNAME:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication")

        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
