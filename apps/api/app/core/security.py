import base64
import hashlib
import hmac
import re
import struct
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import uuid4

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def is_password_strong(password: str) -> bool:
    return (
        len(password) >= 12
        and bool(re.search(r"[A-Z]", password))
        and bool(re.search(r"[a-z]", password))
        and bool(re.search(r"[0-9]", password))
        and bool(re.search(r"[^A-Za-z0-9]", password))
    )

def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": now,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "jti": str(uuid4()),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": now,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_password_reset_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "password_reset",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": now,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=settings.JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
    )


def hash_refresh_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def sign_payload(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload, "sha256").hexdigest()


def verify_payload_signature(payload: bytes, secret: str, signature: str | None) -> bool:
    if not signature:
        return False
    expected = sign_payload(payload, secret)
    return hmac.compare_digest(expected, signature.strip())


def validate_secret_strength() -> None:
    env = settings.ENVIRONMENT
    if env != "development" and len(settings.SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in non-development environments.")
    if env in {"staging", "production"}:
        if not settings.ADMIN_STEP_UP_TOKEN or settings.ADMIN_STEP_UP_TOKEN == "change-me-admin-step-up":
            raise RuntimeError("ADMIN_STEP_UP_TOKEN must be configured in staging/production.")
        if len(settings.ADMIN_STEP_UP_TOTP_SECRET.strip()) < 16:
            raise RuntimeError("ADMIN_STEP_UP_TOTP_SECRET must be configured in staging/production.")
        if len(settings.BILLING_WEBHOOK_SECRET.strip()) < 16:
            raise RuntimeError("BILLING_WEBHOOK_SECRET must be configured in staging/production.")


def verify_totp_code(secret: str, code: str, at_time: int | None = None, period: int = 30, window: int = 1) -> bool:
    """
    RFC6238 compatible TOTP verification using HMAC-SHA1.
    Accepts +/- `window` steps for clock drift tolerance.
    """
    normalized_secret = (secret or "").strip().replace(" ", "").upper()
    if not normalized_secret or not code or not code.isdigit():
        return False
    try:
        key = base64.b32decode(normalized_secret, casefold=True)
    except Exception:
        return False

    now = int(at_time or datetime.now(UTC).timestamp())
    counter = now // period
    width = len(code)

    for offset in range(-window, window + 1):
        c = counter + offset
        if c < 0:
            continue
        msg = struct.pack(">Q", c)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        i = digest[-1] & 0x0F
        binary = (
            ((digest[i] & 0x7F) << 24)
            | ((digest[i + 1] & 0xFF) << 16)
            | ((digest[i + 2] & 0xFF) << 8)
            | (digest[i + 3] & 0xFF)
        )
        otp = str(binary % (10 ** width)).zfill(width)
        if hmac.compare_digest(otp, code):
            return True
    return False
