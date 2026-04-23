"""
Smart rebalancer.

Given user-defined target weights (0..100%) per symbol, compute:
  * current allocation
  * absolute and signed drift
  * how much USD to buy/sell
  * translate that USD into a target quantity using the live price cache

All numbers are in USD (internal reference); mobile can re-denominate.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.portfolio_powers import RebalanceTarget
from app.models.user import User
from app.schemas.portfolio_powers import RebalancePlan, WeightEntry
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio.summary import build_portfolio_summary
from app.services.price.cache import get_all_cached_prices


def _load_target(db: Session, user: User, portfolio: Portfolio) -> tuple[dict[str, float], float]:
    row = (
        db.query(RebalanceTarget)
        .filter(RebalanceTarget.user_id == user.id, RebalanceTarget.portfolio_id == portfolio.id)
        .one_or_none()
    )
    if row is None:
        return {}, 5.0
    weights = {k.upper(): float(v) for k, v in (row.target_weights or {}).items()}
    return weights, float(row.drift_tolerance_pct or 5.0)


async def build_rebalance_plan(
    db: Session,
    user: User,
    portfolio: Portfolio | None = None,
) -> RebalancePlan:
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    summary = await build_portfolio_summary(db, portfolio)
    target_weights, drift_tol = _load_target(db, user, portfolio)

    total_value = float(summary.total_current_value or 0)
    symbols_universe = set()
    current_values: dict[str, float] = {}
    for p in summary.positions:
        sym = p.symbol.upper()
        symbols_universe.add(sym)
        current_values[sym] = float(p.current_value or 0)
    symbols_universe.update(target_weights.keys())

    prices = await get_all_cached_prices(sorted(symbols_universe))

    entries: list[WeightEntry] = []
    for sym in sorted(symbols_universe):
        target_pct = target_weights.get(sym, 0.0)
        current_usd = current_values.get(sym, 0.0)
        current_pct = (current_usd / total_value * 100) if total_value > 0 else 0.0
        drift = current_pct - target_pct
        target_usd = total_value * target_pct / 100
        trade_usd = target_usd - current_usd  # positive = BUY, negative = SELL

        action: str = "hold"
        if abs(drift) > drift_tol:
            action = "buy" if trade_usd > 0 else "sell"

        live = prices.get(sym)
        unit_price = float(live.price) if live else 0.0
        trade_qty = abs(trade_usd / unit_price) if unit_price > 0 else 0.0

        entries.append(
            WeightEntry(
                symbol=sym,
                target_pct=round(target_pct, 2),
                current_pct=round(current_pct, 2),
                drift_pct=round(drift, 2),
                action=action,  # type: ignore[arg-type]
                trade_usd=round(trade_usd, 2),
                trade_quantity=round(trade_qty, 8),
            )
        )

    # Narrative — summarise top 2 actions
    actionable = [e for e in entries if e.action != "hold"]
    if not actionable:
        narrative = (
            "Mevcut dağılımın, hedef ağırlıklarınla toleransın içinde. Şu an müdahale gerekmiyor."
        )
    else:
        actionable.sort(key=lambda e: abs(e.drift_pct), reverse=True)
        top_two = actionable[:2]
        pieces = []
        for e in top_two:
            verb = "ekle" if e.action == "buy" else "azalt"
            pieces.append(
                f"{e.symbol} {e.trade_quantity:.4f} adet {verb} " f"(≈ ${abs(e.trade_usd):,.2f})"
            )
        narrative = "Önerilen iki hamle: " + " · ".join(pieces)

    return RebalancePlan(
        portfolio_id=str(portfolio.id),
        drift_tolerance_pct=round(drift_tol, 2),
        total_value_usd=round(total_value, 2),
        entries=entries,
        narrative=narrative,
        generated_at=datetime.now(UTC),
    )


def upsert_target(
    db: Session,
    user: User,
    portfolio: Portfolio,
    target_weights: dict[str, float],
    drift_tolerance_pct: float,
) -> RebalanceTarget:
    normalized = {k.upper(): float(v) for k, v in target_weights.items() if v is not None}
    total = sum(normalized.values())
    if total <= 0 or total > 101:  # allow tiny float drift
        raise ValueError("Hedef ağırlıkların toplamı 0 ile 100 arasında olmalı.")

    row = (
        db.query(RebalanceTarget)
        .filter(RebalanceTarget.user_id == user.id, RebalanceTarget.portfolio_id == portfolio.id)
        .one_or_none()
    )
    if row is None:
        row = RebalanceTarget(
            user_id=user.id,
            portfolio_id=portfolio.id,
            target_weights=normalized,
            drift_tolerance_pct=drift_tolerance_pct,
        )
        db.add(row)
    else:
        row.target_weights = normalized
        row.drift_tolerance_pct = drift_tolerance_pct
    db.commit()
    db.refresh(row)
    return row
