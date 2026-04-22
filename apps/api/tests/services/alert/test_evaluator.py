from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.alert import ConditionEnum
from app.services.alert.evaluator import AlertEvaluatorService


class FakeQuery:
    def __init__(self, alerts):
        self._alerts = alerts

    def filter(self, *_args, **_kwargs):
        return self

    def all(self):
        return self._alerts


class FakeSession:
    def __init__(self, alerts):
        self._alerts = alerts
        self.added_events = []
        self.committed = False
        self.closed = False

    def query(self, *_args, **_kwargs):
        return FakeQuery(self._alerts)

    def add(self, model):
        self.added_events.append(model)

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_evaluator_triggers_greater_than(monkeypatch):
    alert = SimpleNamespace(
        id='a1',
        asset_id='BTC',
        condition=ConditionEnum.greater_than,
        target_price=Decimal('100'),
        base_price=None,
        is_active=True,
    )
    fake_session = FakeSession([alert])

    async def fake_prices(_symbols):
        return {'BTC': SimpleNamespace(price='120')}

    monkeypatch.setattr('app.services.alert.evaluator.SessionLocal', lambda: fake_session)
    monkeypatch.setattr('app.services.alert.evaluator.get_all_cached_prices', fake_prices)

    service = AlertEvaluatorService()
    await service.evaluate_alerts()

    assert len(fake_session.added_events) == 1
    assert alert.is_active is False
    assert fake_session.committed is True
    assert fake_session.closed is True


@pytest.mark.asyncio
async def test_evaluator_skips_when_price_missing(monkeypatch):
    alert = SimpleNamespace(
        id='a2',
        asset_id='ETH',
        condition=ConditionEnum.less_than,
        target_price=Decimal('2000'),
        base_price=None,
        is_active=True,
    )
    fake_session = FakeSession([alert])

    async def fake_prices(_symbols):
        return {}

    monkeypatch.setattr('app.services.alert.evaluator.SessionLocal', lambda: fake_session)
    monkeypatch.setattr('app.services.alert.evaluator.get_all_cached_prices', fake_prices)

    service = AlertEvaluatorService()
    await service.evaluate_alerts()

    assert fake_session.added_events == []
    assert alert.is_active is True


@pytest.mark.asyncio
async def test_evaluator_percentage_down_edge_case(monkeypatch):
    alert = SimpleNamespace(
        id='a3',
        asset_id='SOL',
        condition=ConditionEnum.percentage_down,
        target_price=Decimal('10'),
        base_price=Decimal('100'),
        is_active=True,
    )
    fake_session = FakeSession([alert])

    async def fake_prices(_symbols):
        return {'SOL': SimpleNamespace(price='90')}

    monkeypatch.setattr('app.services.alert.evaluator.SessionLocal', lambda: fake_session)
    monkeypatch.setattr('app.services.alert.evaluator.get_all_cached_prices', fake_prices)

    service = AlertEvaluatorService()
    await service.evaluate_alerts()

    assert len(fake_session.added_events) == 1
    assert alert.is_active is False
