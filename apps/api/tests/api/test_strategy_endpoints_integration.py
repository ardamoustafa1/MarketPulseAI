from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1.endpoints import strategy


class _FakeAlertQuery:
    def filter(self, *_args, **_kwargs):
        return self

    def count(self):
        return 0


class _FakeDb:
    def __init__(self):
        self.logged: list[dict[str, object]] = []

    def query(self, model):
        if model is strategy.Alert:
            return _FakeAlertQuery()
        raise AssertionError(f"Unexpected query model: {model}")


@pytest.fixture
def auth_user():
    return SimpleNamespace(id=uuid4(), email="integration-user@marketpulse.ai")


@pytest.fixture
def strategy_client(auth_user):
    fake_db = _FakeDb()
    app = FastAPI()
    app.include_router(strategy.router, prefix="/api/v1/strategy")
    app.dependency_overrides[get_db] = lambda: fake_db
    app.dependency_overrides[get_current_user] = lambda: auth_user
    app.dependency_overrides[get_current_admin] = lambda: auth_user
    with TestClient(app) as client:
        yield client, fake_db


def test_coach_loop_returns_explainable_actions(monkeypatch, strategy_client):
    client, _fake_db = strategy_client
    fake_summary = SimpleNamespace(total_current_value=Decimal("0"), total_unrealized_pnl_percent=Decimal("0"))

    monkeypatch.setattr(strategy, "resolve_portfolio", lambda *_args, **_kwargs: SimpleNamespace(id=uuid4()))

    async def _fake_build_summary(*_args, **_kwargs):
        return fake_summary

    monkeypatch.setattr(strategy, "_build_summary_for_portfolio", _fake_build_summary)
    monkeypatch.setattr(strategy, "_fetch_latest_goals", lambda *_args, **_kwargs: [])

    response = client.get("/api/v1/strategy/coach-loop")

    assert response.status_code == 200
    body = response.json()
    assert len(body["actions"]) >= 1
    first = body["actions"][0]
    assert first["reason"]
    assert first["expected_impact"]
    assert Decimal(first["confidence_score"]) > 0


def test_ingest_analytics_event_logs_with_sanitized_name(monkeypatch, strategy_client, auth_user):
    _client, fake_db = strategy_client

    class _FakeAuditService:
        def __init__(self, _db):
            self._db = _db

        def log(self, **kwargs):
            fake_db.logged.append(kwargs)

    monkeypatch.setattr(strategy, "AuditService", _FakeAuditService)

    response = _client.post(
        "/api/v1/strategy/events",
        json={"name": "  Strategy_Hub_Opened  ", "params": {"source": "integration_test"}},
    )

    assert response.status_code == 202
    assert response.json()["status"] == "accepted"
    assert len(fake_db.logged) == 1
    assert fake_db.logged[0]["action"] == "analytics.mobile.strategy_hub_opened"
    assert fake_db.logged[0]["entity_id"] == str(auth_user.id)
