import pytest
from datetime import timedelta
from jose import jwt
from app.core.security import get_password_hash, verify_password
from app.core.security import create_access_token
from app.core.config import settings

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_password_hash_uniqueness():
    """Bcrypt ensures different salts naturally for the same password."""
    password = "SuperSecretPassword123!"
    hash1 = get_password_hash(password)
    hash2 = get_password_hash(password)
    
    assert hash1 != hash2
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True

def test_create_access_token_has_expected_claims():
    token = create_access_token("user-123", expires_delta=timedelta(minutes=5))
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=settings.JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
    )

    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"
    assert payload["iss"] == settings.JWT_ISSUER
    assert payload["aud"] == settings.JWT_AUDIENCE
    assert "exp" in payload
