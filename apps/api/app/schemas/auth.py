from pydantic import BaseModel, EmailStr, constr
from app.schemas.user import User

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in_days: int
    refresh_rotation: bool = True

class LoginPayload(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    totp_code: constr(min_length=6, max_length=8) | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: constr(min_length=20, max_length=4096) | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: constr(min_length=20, max_length=4096)
    new_password: constr(min_length=12, max_length=128)

class AuthResponse(BaseModel):
    user: User
    token: Token
