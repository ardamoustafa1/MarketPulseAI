from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginPayload,
    RefreshTokenRequest,
    ResetPasswordRequest,
)
from app.models.user import User
from app.core.rate_limit import enforce_auth_rate_limit
from app.core.security import decode_token
from jose import JWTError
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
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
    return AuthResponse(user=user, token=token)

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginPayload, request: Request, db: Session = Depends(get_db)):
    await enforce_auth_rate_limit(request, "login")
    auth_service = AuthService(db)
    user = await auth_service.authenticate(payload.email, payload.password)
    token = auth_service.generate_tokens(user)
    AuditService(db).log(
        action="auth.login",
        entity_table="users",
        entity_id=str(user.id),
        details={"email": user.email},
        actor=user,
    )
    db.commit()
    return AuthResponse(user=user, token=token)

@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    await enforce_auth_rate_limit(request, "refresh")
    auth_service = AuthService(db)
    user, token = auth_service.refresh_access_token(payload.refresh_token)
    AuditService(db).log(
        action="auth.refresh",
        entity_table="users",
        entity_id=str(user.id),
        details={},
        actor=user,
    )
    db.commit()
    return AuthResponse(user=user, token=token)

@router.post("/logout")
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        token_payload = decode_token(payload.refresh_token)
    except JWTError:
        return {"message": "Logged out successfully"}
    if token_payload.get("sub") != str(current_user.id):
        return {"message": "Logged out successfully"}
    auth_service = AuthService(db)
    auth_service.revoke_token(payload.refresh_token)
    AuditService(db).log(
        action="auth.logout",
        entity_table="users",
        entity_id=str(current_user.id),
        details={},
        actor=current_user,
    )
    db.commit()
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
