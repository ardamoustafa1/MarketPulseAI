from datetime import timedelta

import pytest
from jose import JWTError

from app.core.security import create_access_token, create_refresh_token, decode_token, hash_refresh_token, is_password_strong


def test_password_strength_policy():
    assert is_password_strong('Strong!Pass123') is True
    assert is_password_strong('weakpass') is False
    assert is_password_strong('NoSymbols1234') is False


def test_refresh_token_hash_is_deterministic_and_non_plaintext():
    token = 'sample-refresh-token'
    hashed = hash_refresh_token(token)

    assert hashed != token
    assert hashed == hash_refresh_token(token)


def test_decode_token_rejects_wrong_type_for_access():
    refresh = create_refresh_token('user-1')
    payload = decode_token(refresh)

    assert payload['type'] == 'refresh'


def test_decode_token_fails_for_wrong_audience(monkeypatch):
    token = create_access_token('user-1', expires_delta=timedelta(minutes=1))

    monkeypatch.setattr('app.core.security.settings.JWT_AUDIENCE', 'different-audience')

    with pytest.raises(JWTError):
        decode_token(token)
