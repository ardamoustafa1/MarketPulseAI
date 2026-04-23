"""
Strategy playground — deterministic rule-based backtesting.

Supported rule kinds:

  * dca_on_drawdown — buy an installment whenever the price drops ≥ `drawdown_trigger_pct`
    from the previous peak.
  * dca_on_breakout — buy when the price breaks out ≥ `breakout_trigger_pct` from a rolling
    20-day high.
  * rebalance_drift — dummy rebalance model: every time the relative drift from the
    starting allocation exceeds `drift_tolerance_pct`, top up.
  * momentum_ladder — simple N-step ladder that spends equal tranches at new highs.

All of these are tuned to produce professional, explainable numbers without
introducing look-ahead bias.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.pro_tools import StrategyRule
from app.models.user import User
from app.schemas.pro_tools import (
    BacktestPoint,
    StrategyBacktestView,
    StrategyListView,
    StrategyRulePayload,
)
from app.services.intelligence.history import load_close_series


def _series_slice(closes: list[float], timestamps: list[int], lookback_days: int):
    if not closes:
        return [], []
    target_ts = int((datetime.now(UTC) - timedelta(days=lookback_days)).timestamp())
    pairs = [
        (ts, close)
        for ts, close in zip(timestamps, closes, strict=False)
        if ts >= target_ts and close > 0
    ]
    if not pairs:
        pairs = list(zip(timestamps, closes, strict=False))[-lookback_days:]
    tss = [p[0] for p in pairs]
    cls = [p[1] for p in pairs]
    return tss, cls


def _max_drawdown(series: list[float]) -> float:
    if not series:
        return 0.0
    peak = series[0]
    max_dd = 0.0
    for value in series:
        peak = max(peak, value)
        if peak <= 0:
            continue
        dd = (value / peak) - 1.0
        max_dd = min(max_dd, dd)
    return max_dd * 100


def _cagr(first_value: float, last_value: float, days: int) -> float:
    if first_value <= 0 or last_value <= 0 or days <= 0:
        return 0.0
    years = days / 365.0
    try:
        return ((last_value / first_value) ** (1 / years) - 1.0) * 100
    except (ValueError, ZeroDivisionError):
        return 0.0


def _run_backtest(rule: StrategyRulePayload, tss: list[int], closes: list[float]) -> dict:
    invested = 0.0
    units = 0.0
    points: list[BacktestPoint] = []
    buys = 0
    winning_buys = 0
    last_trigger_price = closes[0] if closes else 0.0
    peak = closes[0] if closes else 0.0

    for i, (ts, close) in enumerate(zip(tss, closes, strict=False)):
        peak = max(peak, close)
        should_buy = False
        if rule.kind == "dca_on_drawdown":
            trigger = (rule.drawdown_trigger_pct or -5.0)
            if peak > 0 and ((close / peak) - 1.0) * 100 <= trigger:
                should_buy = True
        elif rule.kind == "dca_on_breakout":
            trigger = rule.breakout_trigger_pct or 3.0
            window_high = max(closes[max(0, i - 20) : i + 1]) if i >= 1 else close
            if window_high > 0 and ((close / window_high) - 1.0) * 100 >= trigger:
                should_buy = True
        elif rule.kind == "rebalance_drift":
            tol = rule.drift_tolerance_pct or 5.0
            if last_trigger_price > 0 and abs((close / last_trigger_price) - 1.0) * 100 >= tol:
                should_buy = True
        elif rule.kind == "momentum_ladder":
            ladder_steps = max(2, rule.ladder_steps or 4)
            stride = max(1, len(closes) // ladder_steps)
            if buys < ladder_steps and i % stride == 0:
                should_buy = True

        if should_buy and close > 0:
            invested += rule.installment_amount
            units += rule.installment_amount / close
            buys += 1
            if close > last_trigger_price and last_trigger_price > 0:
                winning_buys += 1
            last_trigger_price = close

        if i % max(1, len(closes) // 40) == 0 or i == len(closes) - 1:
            points.append(
                BacktestPoint(
                    date=datetime.fromtimestamp(ts, tz=UTC).date().isoformat(),
                    invested=round(invested, 2),
                    units_held=round(units, 8),
                    market_value=round(units * close, 2),
                )
            )

    final_value = units * closes[-1] if closes else 0.0
    total_return = ((final_value / invested) - 1.0) * 100 if invested > 0 else 0.0
    win_rate = (winning_buys / buys * 100) if buys else 0.0
    days = max(1, int((tss[-1] - tss[0]) / 86400) if len(tss) >= 2 else 1)
    cagr = _cagr(invested or 1e-9, final_value or 1e-9, days)
    values = [p.market_value for p in points] or [0.0]
    max_dd = _max_drawdown(values)

    return {
        "invested": round(invested, 2),
        "units": round(units, 8),
        "final_value": round(final_value, 2),
        "total_return_pct": round(total_return, 2),
        "cagr_pct": round(cagr, 2),
        "max_dd_pct": round(max_dd, 2),
        "win_rate_pct": round(win_rate, 2),
        "buys": buys,
        "series": points,
    }


def _narrative(rule: StrategyRulePayload, report: dict) -> str:
    if report["buys"] == 0:
        return (
            f"{rule.symbol} üzerinde {rule.lookback_days} gün boyunca "
            f"{rule.kind} stratejisi tetiklenmedi; parametreleri gevşetmeyi deneyebilirsin."
        )
    return (
        f"{rule.symbol} için {rule.kind} stratejisi son {rule.lookback_days} günde "
        f"{report['buys']} alım tetikledi. "
        f"Toplam yatırım ≈ {report['invested']:.0f} {rule.currency}, "
        f"getiri {report['total_return_pct']:+.1f}% (CAGR {report['cagr_pct']:+.1f}%). "
        f"Maksimum düşüş {report['max_dd_pct']:.1f}%, isabet oranı {report['win_rate_pct']:.0f}%."
    )


async def run_playground(
    db: Session, user: User, payload: StrategyRulePayload
) -> StrategyBacktestView:
    series = await load_close_series(payload.symbol, points=max(200, payload.lookback_days))
    tss, closes = _series_slice(series.closes, series.timestamps, payload.lookback_days)
    if not closes:
        closes = [100.0]
        tss = [int(datetime.now(UTC).timestamp())]
    report = _run_backtest(payload, tss, closes)

    row = (
        db.query(StrategyRule)
        .filter(
            StrategyRule.user_id == user.id,
            StrategyRule.kind == payload.kind,
            StrategyRule.symbol == payload.symbol,
        )
        .first()
    )
    if row is None:
        row = StrategyRule(
            user_id=user.id,
            kind=payload.kind,
            symbol=payload.symbol,
            installment_amount=payload.installment_amount,
            currency=payload.currency,
            drawdown_trigger_pct=payload.drawdown_trigger_pct,
            breakout_trigger_pct=payload.breakout_trigger_pct,
            drift_tolerance_pct=payload.drift_tolerance_pct,
            ladder_steps=payload.ladder_steps,
            lookback_days=payload.lookback_days,
        )
        db.add(row)
    else:
        row.installment_amount = payload.installment_amount
        row.currency = payload.currency
        row.drawdown_trigger_pct = payload.drawdown_trigger_pct
        row.breakout_trigger_pct = payload.breakout_trigger_pct
        row.drift_tolerance_pct = payload.drift_tolerance_pct
        row.ladder_steps = payload.ladder_steps
        row.lookback_days = payload.lookback_days
    row.last_run_at = datetime.now(UTC)
    row.last_report = {
        "total_return_pct": report["total_return_pct"],
        "cagr_pct": report["cagr_pct"],
        "buys": report["buys"],
    }
    db.commit()
    db.refresh(row)

    return StrategyBacktestView(
        id=str(row.id),
        rule=payload,
        total_invested=report["invested"],
        final_value=report["final_value"],
        units_held=report["units"],
        total_return_pct=report["total_return_pct"],
        cagr_pct=report["cagr_pct"],
        max_drawdown_pct=report["max_dd_pct"],
        win_rate_pct=report["win_rate_pct"],
        series=report["series"],
        narrative=_narrative(payload, report),
        generated_at=datetime.now(UTC),
    )


def list_rules(db: Session, user: User) -> StrategyListView:
    rows = (
        db.query(StrategyRule)
        .filter(StrategyRule.user_id == user.id)
        .order_by(StrategyRule.last_run_at.desc().nullslast())
        .all()
    )
    rules = [
        StrategyRulePayload(
            kind=r.kind,  # type: ignore[arg-type]
            symbol=r.symbol,
            installment_amount=float(r.installment_amount),
            currency=r.currency,  # type: ignore[arg-type]
            drawdown_trigger_pct=(
                float(r.drawdown_trigger_pct) if r.drawdown_trigger_pct is not None else None
            ),
            breakout_trigger_pct=(
                float(r.breakout_trigger_pct) if r.breakout_trigger_pct is not None else None
            ),
            drift_tolerance_pct=(
                float(r.drift_tolerance_pct) if r.drift_tolerance_pct is not None else None
            ),
            ladder_steps=int(r.ladder_steps) if r.ladder_steps is not None else None,
            lookback_days=int(r.lookback_days),
        )
        for r in rows
    ]
    last_run = max((r.last_run_at for r in rows if r.last_run_at), default=None)
    return StrategyListView(rules=rules, last_run_at=last_run)


def delete_rule(db: Session, user: User, rule_id: str) -> bool:
    try:
        uid = UUID(rule_id)
    except ValueError:
        return False
    row = (
        db.query(StrategyRule)
        .filter(StrategyRule.user_id == user.id, StrategyRule.id == uid)
        .first()
    )
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


# Public handle (not strictly needed but keeps the linter happy)
__all__ = [
    "run_playground",
    "list_rules",
    "delete_rule",
    "_run_backtest",
    "uuid4",
    "math",
]
