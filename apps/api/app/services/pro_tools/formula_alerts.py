"""
Alerts 2.0 — formula-based compound alerts.

Users can define multi-condition alerts (AND / OR) that mix different asset
metrics such as price thresholds, asset/asset ratios (BTC/ETH, XAU/USD),
24-hour percent change, RSI snapshots, or realized volatility. The evaluator
re-uses cached prices + historical close loaders so it is cheap to call on a
cron tick.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.pro_tools import FormulaAlert
from app.models.user import User
from app.schemas.pro_tools import (
    FormulaAlertPayload,
    FormulaAlertView,
    FormulaCondition,
    FormulaEvaluationResult,
)
from app.services.intelligence.history import load_close_series
from app.services.price.cache import get_cached_price


def _to_view(row: FormulaAlert) -> FormulaAlertView:
    conds = [FormulaCondition(**c) for c in (row.conditions or [])]
    return FormulaAlertView(
        id=str(row.id),
        name=row.name,
        description=row.description,
        conditions=conds,
        logical_operator=row.logical_operator,  # type: ignore[arg-type]
        is_active=bool(row.is_active),
        last_triggered_at=row.last_triggered_at,
        trigger_count=int(row.trigger_count or 0),
        notify_push=bool(row.notify_push),
        notify_email=bool(row.notify_email),
        created_at=row.created_at,
    )


def create_alert(db: Session, user: User, payload: FormulaAlertPayload) -> FormulaAlertView:
    if not payload.conditions:
        raise ValueError("En az bir koşul gerekli.")
    row = FormulaAlert(
        user_id=user.id,
        name=payload.name.strip()[:120] or "Adsız alarm",
        description=(payload.description or "").strip()[:500] or None,
        conditions=[c.model_dump() for c in payload.conditions],
        logical_operator=payload.logical_operator,
        notify_push=payload.notify_push,
        notify_email=payload.notify_email,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_view(row)


def list_alerts(db: Session, user: User) -> list[FormulaAlertView]:
    rows = (
        db.query(FormulaAlert)
        .filter(FormulaAlert.user_id == user.id)
        .order_by(FormulaAlert.created_at.desc())
        .all()
    )
    return [_to_view(r) for r in rows]


def delete_alert(db: Session, user: User, alert_id: str) -> bool:
    try:
        uid = UUID(alert_id)
    except ValueError:
        return False
    row = (
        db.query(FormulaAlert)
        .filter(FormulaAlert.user_id == user.id, FormulaAlert.id == uid)
        .first()
    )
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def toggle_alert(db: Session, user: User, alert_id: str, active: bool) -> FormulaAlertView | None:
    try:
        uid = UUID(alert_id)
    except ValueError:
        return None
    row = (
        db.query(FormulaAlert)
        .filter(FormulaAlert.user_id == user.id, FormulaAlert.id == uid)
        .first()
    )
    if row is None:
        return None
    row.is_active = active
    db.commit()
    db.refresh(row)
    return _to_view(row)


async def _resolve_metric(cond: FormulaCondition) -> tuple[float | None, str]:
    sym = cond.symbol.upper()
    if cond.metric == "price":
        live = await get_cached_price(sym)
        return (float(live.price) if live else None), "spot"
    if cond.metric == "ratio" and cond.reference_symbol:
        a = await get_cached_price(sym)
        b = await get_cached_price(cond.reference_symbol.upper())
        if a and b and float(b.price) > 0:
            return float(a.price) / float(b.price), "ratio"
        return None, "ratio"
    if cond.metric == "percent_change_24h":
        series = await load_close_series(sym, points=60)
        if len(series.closes) >= 2:
            return ((series.closes[-1] / series.closes[-2]) - 1.0) * 100.0, "change_24h"
        return None, "change_24h"
    if cond.metric == "rsi_14":
        series = await load_close_series(sym, points=120)
        closes = series.closes
        if len(closes) >= 15:
            from app.services.pro_tools.technical_analysis import _rsi

            return _rsi(closes, 14), "rsi"
        return None, "rsi"
    if cond.metric == "volatility_30d":
        series = await load_close_series(sym, points=40)
        closes = series.closes
        if len(closes) >= 20:
            rets = [
                (closes[i] / closes[i - 1]) - 1.0
                for i in range(1, len(closes))
                if closes[i - 1] > 0
            ]
            tail = rets[-30:]
            avg = sum(tail) / len(tail)
            var = sum((x - avg) ** 2 for x in tail) / len(tail)
            vol = (var ** 0.5) * (252 ** 0.5) * 100
            return vol, "vol30"
        return None, "vol30"
    return None, "unknown"


def _matches(operator: str, value: float, target: float) -> bool:
    if operator == "gt":
        return value > target
    if operator == "gte":
        return value >= target
    if operator == "lt":
        return value < target
    if operator == "lte":
        return value <= target
    if operator in ("change_pct_gte", "cross_above"):
        return value >= target
    if operator in ("change_pct_lte", "cross_below"):
        return value <= target
    return False


async def evaluate_alert(db: Session, alert: FormulaAlert) -> FormulaEvaluationResult:
    conditions = alert.conditions or []
    results: list[dict] = []
    outcomes: list[bool] = []
    for raw in conditions:
        cond = FormulaCondition(**raw)
        value, scope = await _resolve_metric(cond)
        matched = False if value is None else _matches(cond.operator, value, cond.target)
        outcomes.append(matched)
        results.append(
            {
                "symbol": cond.symbol,
                "metric": cond.metric,
                "operator": cond.operator,
                "target": cond.target,
                "value": None if value is None else round(value, 6),
                "scope": scope,
                "matched": matched,
            }
        )
    if not outcomes:
        triggered = False
    elif alert.logical_operator == "and":
        triggered = all(outcomes)
    else:
        triggered = any(outcomes)
    now = datetime.now(UTC)
    if triggered:
        alert.last_triggered_at = now
        alert.trigger_count = int(alert.trigger_count or 0) + 1
        db.commit()
    return FormulaEvaluationResult(
        alert_id=str(alert.id),
        triggered=triggered,
        condition_results=results,
        evaluated_at=now,
    )


async def evaluate_all(db: Session, user: User) -> list[FormulaEvaluationResult]:
    rows = (
        db.query(FormulaAlert)
        .filter(FormulaAlert.user_id == user.id, FormulaAlert.is_active.is_(True))
        .all()
    )
    return [await evaluate_alert(db, row) for row in rows]
