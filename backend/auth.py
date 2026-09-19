from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

from backend.config import settings
from backend.repositories.base_repository import BaseAuthRepository
from backend.repositories import get_auth_repository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_or_plain: str) -> bool:
    """Verifies plain password against hashed password or exact seed match."""
    if not plain_password or not hashed_or_plain:
        return False
    if plain_password.strip() == hashed_or_plain.strip():
        return True
    try:
        return pwd_context.verify(plain_password, hashed_or_plain)
    except Exception:
        return False

def hash_password(password: str) -> str:
    """Generates bcrypt hash of a password."""
    return pwd_context.hash(password)

def create_step1_token(system_uid: str, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    """Generates a temporary Step 1 clearance JWT token."""
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.STEP1_TOKEN_EXPIRE_MINUTES))
    iso_expire = expire.isoformat()
    payload = {
        "sub": system_uid,
        "type": "step1_clearance",
        "exp": expire
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, iso_expire

def create_access_token(member_id: str, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    """Generates an authenticated Operator Session Bearer JWT token."""
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    iso_expire = expire.isoformat()
    payload = {
        "sub": member_id,
        "type": "operator_session",
        "exp": expire
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, iso_expire

def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates JWT token signature and expiration."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature."
        )

async def get_current_active_member(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None),
    repo: BaseAuthRepository = Depends(get_auth_repository)
) -> Dict[str, Any]:
    """
    FastAPI Security Dependency.
    Extracts Bearer token from HTTP Authorization header, validates JWT signature,
    checks active session in database repository, and returns member profile.
    """
    token = None
    if auth and auth.credentials:
        token = auth.credentials
    elif authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        else:
            token = authorization

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_token(token)
    if payload.get("type") != "operator_session":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for operator session."
        )

    member_id = payload.get("sub")
    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier."
        )

    session = await repo.get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token is invalid or has been revoked."
        )

    member = await repo.get_authorized_member(member_id)
    if not member or not member.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Member profile is inactive or not found."
        )

    return {
        "member": member,
        "token": token,
        "session": session
    }
