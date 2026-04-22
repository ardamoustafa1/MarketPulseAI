from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.services.websocket.manager import ConnectionManager

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

# Shared DI Instances
_global_ws_manager = ConnectionManager()

def get_ws_manager() -> ConnectionManager:
    """Dependency injector for WebSocket ConnectionManager"""
    return _global_ws_manager

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), 
    request: Request = None,
    token: str = Depends(oauth2_scheme),
) -> User:
    try:
        resolved_token = token
        if not resolved_token or resolved_token == "null":
            cookie_name = settings.AUTH_COOKIE_NAME
            resolved_token = request.cookies.get(cookie_name)
        if not resolved_token:
            raise UnauthorizedException(detail="Missing authentication token")
        payload = decode_token(resolved_token)
        if payload.get("type") != "access":
            raise UnauthorizedException(detail="Invalid token type")
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException(detail="Invalid token payload")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UnauthorizedException(detail="User not found")
        
        if not user.is_active:
            raise UnauthorizedException(detail="Inactive user account")
            
        return user
    except JWTError:
        raise UnauthorizedException(detail="Could not validate credentials")


def enforce_csrf_for_cookie_auth(
    request: Request,
    x_csrf_token: str | None = Header(default=None, alias="x-csrf-token"),
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    auth_cookie = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not auth_cookie:
        return
    csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
    if not csrf_cookie or not x_csrf_token or csrf_cookie != x_csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role.value != "admin":
        raise ForbiddenException(detail="The user doesn't have enough privileges")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role.value not in self.allowed_roles:
            raise ForbiddenException(detail="Operation not permitted")
        return user
