import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.deps import enforce_csrf_for_cookie_auth, get_current_user, get_db
from app.core.config import settings
from app.core.rate_limit import enforce_auth_rate_limit
from app.core.security import decode_token
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginPayload,
    RefreshTokenRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserCreate
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService

router = APIRouter()


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str, csrf_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    await enforce_auth_rate_limit(request, "register")
    auth_service = AuthService(db)
    user = auth_service.create_user(user_in)
    token = auth_service.generate_tokens(user)
    AuditService(db).log(
        action="auth.register",
        entity_table="users",
        entity_id=str(user.id),
        details={"email": user.email},
        actor=user,
    )
    db.commit()
    csrf_token = secrets.token_urlsafe(24)
    _set_auth_cookies(response, token.access_token, token.refresh_token, csrf_token)
    return AuthResponse(user=user, token=token)

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    await enforce_auth_rate_limit(request, "login")
    auth_service = AuthService(db)
    user = await auth_service.authenticate(payload.email, payload.password, payload.totp_code)
    token = auth_service.generate_tokens(user)
    AuditService(db).log(
        action="auth.login",
        entity_table="users",
        entity_id=str(user.id),
        details={"email": user.email},
        actor=user,
    )
    db.commit()
    csrf_token = secrets.token_urlsafe(24)
    _set_auth_cookies(response, token.access_token, token.refresh_token, csrf_token)
    return AuthResponse(user=user, token=token)

@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    await enforce_auth_rate_limit(request, "refresh")
    auth_service = AuthService(db)
    refresh = payload.refresh_token or request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not refresh:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    user, token = auth_service.refresh_access_token(refresh)
    AuditService(db).log(
        action="auth.refresh",
        entity_table="users",
        entity_id=str(user.id),
        details={},
        actor=user,
    )
    db.commit()
    csrf_token = secrets.token_urlsafe(24)
    _set_auth_cookies(response, token.access_token, token.refresh_token, csrf_token)
    return AuthResponse(user=user, token=token)

@router.post("/logout")
def logout(
    payload: RefreshTokenRequest | None = None,
    request: Request = None,
    response: Response = None,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_csrf_for_cookie_auth),
    current_user: User = Depends(get_current_user),
):
    refresh_token = (
        (payload.refresh_token if payload else None)
        or (request.cookies.get(settings.REFRESH_COOKIE_NAME) if request else None)
    )
    try:
        token_payload = decode_token(refresh_token) if refresh_token else {}
    except JWTError:
        return {"message": "Logged out successfully"}
    if token_payload.get("sub") != str(current_user.id):
        return {"message": "Logged out successfully"}
    auth_service = AuthService(db)
    if refresh_token:
        auth_service.revoke_token(refresh_token)
    AuditService(db).log(
        action="auth.logout",
        entity_table="users",
        entity_id=str(current_user.id),
        details={},
        actor=current_user,
    )
    db.commit()
    if response is not None:
        response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/")
        response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/")
        response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    await auth_service.request_password_reset(payload.email)
    # Intentionally generic to prevent user enumeration.
    return {"message": "If that email exists, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    await auth_service.reset_password_with_token(payload.token, payload.new_password)
    return {"message": "Password has been successfully updated."}
