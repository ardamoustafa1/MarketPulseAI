"""
Multi-denomination portfolio valuation (TRY / USD / EUR / BTC / gold-gram).

Valuation rule:
  * USD is the internal reference unit (matches price.cache).
  * TRY / EUR / GBP etc. → multiply USD by USDxxx rate (using cached FX).
  * BTC → divide USD by BTC USD price.
  * GOLD-gram → divide USD by (XAU_USD / TROY_OUNCE_IN_GRAMS) = USD per gram.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.user import User
from app.schemas.portfolio_powers import (
    DenominatedPosition,
    Denomination,
    DenominationResponse,
)
from app.services.intelligence.history import load_close_series
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio.summary import build_portfolio_summary
from app.services.price.cache import get_all_cached_prices

TROY_OUNCE_IN_GRAMS = 31.1034768


async def _rate_usd_to(denom: Denomination) -> float:
    """Return "1 USD = X <denom>"."""
    prices = await get_all_cached_prices(["USDTRY", "EURUSD", "BTC", "XAU"])
    if denom == "USD":
        return 1.0
    if denom == "TRY":
        tp = prices.get("USDTRY")
        return float(tp.price) if tp else 0.0
    if denom == "EUR":
        # EURUSD is EUR→USD, so 1 USD = 1/EURUSD
        eu = prices.get("EURUSD")
        return (1.0 / float(eu.price)) if (eu and float(eu.price) > 0) else 0.0
    if denom == "BTC":
        btc = prices.get("BTC")
        return (1.0 / float(btc.price)) if (btc and float(btc.price) > 0) else 0.0
    if denom == "XAU_GRAM":
        xau = prices.get("XAU")
        if xau and float(xau.price) > 0:
            # USD per gram = XAU_per_ounce / grams_per_ounce ; rate = 1 / (USD_per_gram)
            usd_per_gram = float(xau.price) / TROY_OUNCE_IN_GRAMS
            return 1.0 / usd_per_gram if usd_per_gram > 0 else 0.0
    return 0.0


async def build_denomination_snapshot(
    db: Session,
    user: User,
    denomination: Denomination,
    portfolio: Portfolio | None = None,
) -> DenominationResponse:
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    summary = await build_portfolio_summary(db, portfolio)

    rate = await _rate_usd_to(denomination)

    positions: list[DenominatedPosition] = []
    for pos in summary.positions:
        # Summary fields are in USD (same reference as cache)
        cur_usd = float(pos.current_value) if pos.current_value is not None else 0.0
        cost_usd = float(pos.total_invested) if pos.total_invested is not None else 0.0
        pnl_usd = cur_usd - cost_usd
        positions.append(
            DenominatedPosition(
                symbol=pos.symbol,
                quantity=float(pos.quantity_held or 0),
                current_value=round(cur_usd * rate, 6),
                cost_basis=round(cost_usd * rate, 6),
                unrealized_pnl=round(pnl_usd * rate, 6),
                unrealized_pnl_pct=round(((cur_usd / cost_usd - 1) * 100) if cost_usd else 0.0, 3),
            )
        )

    total_usd = float(summary.total_current_value or 0)
    cost_total_usd = float(summary.total_invested or 0)
    pnl_total_usd = total_usd - cost_total_usd
    mtd_pct: float | None = None

    # Month-to-date change in the user's chosen denomination, proxied via the
    # FX/BTC/gold series moves over the past 21 trading days.
    try:
        if denomination == "TRY":
            ser = await load_close_series("USDTRY", points=30)
        elif denomination == "EUR":
            ser = await load_close_series("EURUSD", points=30)
        elif denomination == "BTC":
            ser = await load_close_series("BTC", points=30)
        elif denomination == "XAU_GRAM":
            ser = await load_close_series("XAU", points=30)
        else:
            ser = None
        if ser and len(ser.closes) >= 21:
            ref = ser.closes[-21]
            cur = ser.closes[-1]
            if ref > 0:
                mtd_pct = round((cur / ref - 1.0) * 100, 2)
                if denomination in ("EUR", "BTC"):
                    mtd_pct = -mtd_pct  # inverse — stronger BTC ⇒ portfolio shrinks in BTC terms
    except Exception:  # noqa: BLE001
        mtd_pct = None

    return DenominationResponse(
        denomination=denomination,
        rate_used=round(rate, 8),
        total_value=round(total_usd * rate, 6),
        cost_basis=round(cost_total_usd * rate, 6),
        unrealized_pnl=round(pnl_total_usd * rate, 6),
        unrealized_pnl_pct=round(
            ((total_usd / cost_total_usd - 1) * 100) if cost_total_usd else 0.0, 3
        ),
        month_to_date_change_pct=mtd_pct,
        positions=positions,
    )
