from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_authenticate_rejects_after_bruteforce_limit(fake_redis):
    db = MagicMock()
    service = AuthService(db)
    service.redis = fake_redis

    fake_redis.store['bruteforce:login:blocked@marketpulse.ai'] = 5

    with pytest.raises(HTTPException) as exc:
        await service.authenticate('blocked@marketpulse.ai', 'irrelevant')

    assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_authenticate_registers_failed_attempt(fake_redis, monkeypatch):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    service = AuthService(db)
    service.redis = fake_redis

    monkeypatch.setattr('app.services.auth_service.verify_password', lambda *_args, **_kwargs: False)

    with pytest.raises(HTTPException) as exc:
        await service.authenticate('wrong@marketpulse.ai', 'bad-pass')

    assert exc.value.status_code == 401
    assert fake_redis.store['bruteforce:login:wrong@marketpulse.ai'] == 1


@pytest.mark.asyncio
async def test_authenticate_clears_failed_attempts_on_success(fake_redis, monkeypatch):
    db = MagicMock()
    user = SimpleNamespace(id='u1', is_active=True, hashed_password='hashed')
    db.query.return_value.filter.return_value.first.return_value = user

    service = AuthService(db)
    service.redis = fake_redis
    fake_redis.store['bruteforce:login:ok@marketpulse.ai'] = 3

    monkeypatch.setattr('app.services.auth_service.verify_password', lambda *_args, **_kwargs: True)

    result = await service.authenticate('ok@marketpulse.ai', 'good-pass')

    assert result is user
    assert 'bruteforce:login:ok@marketpulse.ai' not in fake_redis.store


@pytest.mark.asyncio
async def test_authenticate_rejects_inactive_user(fake_redis, monkeypatch):
    db = MagicMock()
    user = SimpleNamespace(id='u2', is_active=False, hashed_password='hashed')
    db.query.return_value.filter.return_value.first.return_value = user

    service = AuthService(db)
    service.redis = fake_redis
    monkeypatch.setattr('app.services.auth_service.verify_password', lambda *_args, **_kwargs: True)

    with pytest.raises(HTTPException) as exc:
        await service.authenticate('inactive@marketpulse.ai', 'pass')

    assert exc.value.status_code == 400
