"""End-user TOTP (RFC6238) enrollment and management."""
from __future__ import annotations

import base64
import os
import secrets
from datetime import UTC, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import verify_password, verify_totp_code
from app.models.user import User

router = APIRouter()

TOTP_ISSUER = "MarketPulse AI"


class TotpSetupResponse(BaseModel):
    secret: str = Field(..., description="Base32 TOTP secret (display for manual entry).")
    otpauth_url: str = Field(..., description="otpauth:// URL — render as QR code.")


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class TotpDisableRequest(BaseModel):
    password: str = Field(..., min_length=1)
    code: str | None = Field(None, min_length=6, max_length=8)


class TotpStatusResponse(BaseModel):
    enabled: bool
    confirmed_at: datetime | None = None


def _generate_base32_secret(num_bytes: int = 20) -> str:
    raw = os.urandom(num_bytes)
    return base64.b32encode(raw).decode("ascii").rstrip("=")


def _otpauth_url(secret: str, account: str, issuer: str = TOTP_ISSUER) -> str:
    label = quote(f"{issuer}:{account}", safe="")
    params = f"secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"
    return f"otpauth://totp/{label}?{params}"


@router.get("/status", response_model=TotpStatusResponse)
def totp_status(current_user: User = Depends(get_current_user)):
    return TotpStatusResponse(
        enabled=bool(current_user.totp_enabled),
        confirmed_at=current_user.totp_confirmed_at,
    )


@router.post("/setup", response_model=TotpSetupResponse)
def totp_setup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a new TOTP secret for the current user.
    Not activated until verify is called with a valid code.
    """
    if current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Two-factor authentication is already enabled. Disable it first to re-enrol.",
        )

    new_secret = _generate_base32_secret()
    current_user.totp_secret = new_secret
    current_user.totp_enabled = False
    current_user.totp_confirmed_at = None
    db.commit()
    db.refresh(current_user)

    account = current_user.email or str(current_user.id)
    return TotpSetupResponse(
        secret=new_secret,
        otpauth_url=_otpauth_url(new_secret, account),
    )


@router.post("/verify", response_model=TotpStatusResponse)
def totp_verify(
    payload: TotpVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Activate TOTP for the user after confirming they control the authenticator."""
    secret = current_user.totp_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call /setup before verifying.",
        )
    if not verify_totp_code(secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    current_user.totp_enabled = True
    current_user.totp_confirmed_at = datetime.now(UTC)
    db.commit()
    db.refresh(current_user)
    return TotpStatusResponse(
        enabled=True,
        confirmed_at=current_user.totp_confirmed_at,
    )


@router.post("/disable", response_model=TotpStatusResponse)
def totp_disable(
    payload: TotpDisableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable TOTP. Requires password re-entry, and an OTP code if currently enabled."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password is incorrect.",
        )

    if current_user.totp_enabled:
        if not payload.code or not verify_totp_code(current_user.totp_secret or "", payload.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid TOTP code is required to disable 2FA.",
            )

    current_user.totp_secret = None
    current_user.totp_enabled = False
    current_user.totp_confirmed_at = None
    db.commit()
    db.refresh(current_user)
    return TotpStatusResponse(enabled=False, confirmed_at=None)


__all__ = [
    "router",
    "TotpSetupResponse",
    "TotpVerifyRequest",
    "TotpDisableRequest",
    "TotpStatusResponse",
    "_generate_base32_secret",
    "_otpauth_url",
]
_ = secrets  # kept for future recovery-code generation; silence unused-import warnings
