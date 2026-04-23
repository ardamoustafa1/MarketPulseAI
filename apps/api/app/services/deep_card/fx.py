"""
Deep card builder for FX pairs.

Covers:
  * Spot + 24h change
  * Swap / forward curve (implied via policy-rate differentials, static table)
  * Real interest rate (nominal policy − CPI best-estimate)
  * TCMB reserves trend (static seed, replace with real feed when wired)
  * Offshore vs onshore spread (proxy from USDTRY vs DXY movement)
  * Carry score (reused from fx_carry.POLICY_RATES)
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from app.schemas.deep_card import (
    Bullet,
    FxDeepCard,
    FxReservePoint,
    KeyMetric,
    SwapPoint,
)
from app.services.intelligence.features import pct_change, safe_std
from app.services.intelligence.fx_carry import POLICY_RATES
from app.services.intelligence.history import load_many
from app.services.price.cache import get_cached_price

# CPI y/y (best-effort static seed). Replace with official data feed.
_CPI_YY: dict[str, float] = {
    "TRY": 44.0,
    "USD": 3.4,
    "EUR": 2.7,
    "GBP": 2.9,
    "JPY": 2.1,
    "CHF": 1.3,
    "CAD": 2.6,
    "AUD": 3.0,
    "CNH": 0.6,
    "ZAR": 5.5,
    "INR": 5.1,
    "MXN": 4.2,
    "BRL": 4.6,
    "KRW": 2.9,
    "SGD": 2.5,
}

# TCMB rezerv trend (resmi rezervler + altın dahil, USD milyar, ayl\u0131k). Static seed.
_TCMB_RESERVES: list[FxReservePoint] = [
    FxReservePoint(date="2025-11", usd_billions=162.4),
    FxReservePoint(date="2025-12", usd_billions=166.1),
    FxReservePoint(date="2026-01", usd_billions=170.9),
    FxReservePoint(date="2026-02", usd_billions=172.3),
    FxReservePoint(date="2026-03", usd_billions=169.7),
    FxReservePoint(date="2026-04", usd_billions=171.5),
]

_TENORS = [("1W", 7), ("1M", 30), ("3M", 90), ("6M", 180), ("1Y", 365)]


def _split_pair(symbol: str) -> tuple[str, str]:
    sym = symbol.upper()
    if len(sym) >= 6:
        return sym[:3], sym[3:6]
    return sym, "USD"


async def build_fx_card(symbol: str, label: str) -> FxDeepCard:
    sym = symbol.upper()
    base, quote = _split_pair(sym)

    price_obj = await get_cached_price(sym)
    price = float(price_obj.price) if price_obj else 0.0
    change_24h = (
        float(price_obj.change_24h) if price_obj and price_obj.change_24h is not None else None
    )

    history = await load_many([sym, "EURUSD"], points=200)
    series = history.get(sym)

    base_rate = POLICY_RATES.get(base)
    quote_rate = POLICY_RATES.get(quote)
    diff = (base_rate - quote_rate) if (base_rate is not None and quote_rate is not None) else 0.0

    # Swap / forward curve — covered-interest-parity implied points.
    swap_curve: list[SwapPoint] = []
    if price > 0 and base_rate is not None and quote_rate is not None:
        for tenor, days in _TENORS:
            t = days / 365
            implied_fwd = price * (1 + quote_rate / 100 * t) / (1 + base_rate / 100 * t)
            points_val = (implied_fwd - price) * (10**4 if price < 10 else 1)
            swap_curve.append(
                SwapPoint(
                    tenor=tenor,
                    points=round(points_val, 4),
                    implied_rate_pct=round(diff, 2),
                )
            )

    real_rate: float | None = None
    if base_rate is not None:
        cpi_base = _CPI_YY.get(base, 0.0)
        real_rate = round(base_rate - cpi_base, 2)

    # Offshore vs onshore — USDTRY için offshore forward eğrisi yaklaşımı:
    # implied 1M forward rate eğer spot farkından yüksekse → offshore gap
    offshore_vs_onshore: float | None = None
    if sym == "USDTRY" and swap_curve:
        one_month = next((sp for sp in swap_curve if sp.tenor == "1M"), None)
        if one_month and price > 0:
            implied_fwd = (
                price
                * (1 + (quote_rate or 0) / 100 * 30 / 365)
                / (1 + (base_rate or 0) / 100 * 30 / 365)
            )
            offshore_vs_onshore = round((implied_fwd / price - 1.0) * 100, 3)

    carry_score: float | None = None
    if series and len(series.closes) > 30:
        rets = pct_change(series.closes[-60:])
        vol = safe_std(rets) * (252**0.5)
        if vol > 0:
            carry_score = round(diff / (vol * 100), 3)

    key_metrics: list[KeyMetric] = [
        KeyMetric(
            label=f"{base} faiz", value=f"{base_rate:.2f}%" if base_rate is not None else "—"
        ),
        KeyMetric(
            label=f"{quote} faiz", value=f"{quote_rate:.2f}%" if quote_rate is not None else "—"
        ),
    ]
    if real_rate is not None:
        key_metrics.append(
            KeyMetric(
                label="Reel faiz",
                value=f"{real_rate:+.2f}%",
                tone="positive" if real_rate > 0 else "negative",
            )
        )
    if carry_score is not None:
        key_metrics.append(
            KeyMetric(
                label="Carry skoru",
                value=f"{carry_score:+.2f}",
                tone="positive" if carry_score > 0 else "negative",
            )
        )

    bullets: list[Bullet] = []
    if real_rate is not None and real_rate < -5:
        bullets.append(
            Bullet(
                text=f"Reel faiz çok negatif (%{real_rate:+.1f}) — enflasyon kalkanı zayıf.",
                tone="warning",
            )
        )
    if offshore_vs_onshore is not None and abs(offshore_vs_onshore) > 0.5:
        bullets.append(
            Bullet(
                text=f"Offshore/onshore farkı %{offshore_vs_onshore:+.2f} — swap maliyeti artmış.",
                tone="warning" if offshore_vs_onshore > 0 else "neutral",
            )
        )
    if carry_score is not None and carry_score > 1.5:
        bullets.append(
            Bullet(text="Faiz avantajı vs oynaklık sağlam — carry lehine pencere.", tone="positive")
        )

    return FxDeepCard(
        asset_class="fx",
        symbol=sym,
        label=label,
        live_price=price,
        change_24h_pct=change_24h,
        base_currency=base,
        quote_currency=quote,
        swap_curve=swap_curve,
        real_interest_rate_pct=real_rate,
        tcmb_reserves_trend=_TCMB_RESERVES if "TRY" in sym else [],
        offshore_vs_onshore_spread_pct=offshore_vs_onshore,
        carry_score=carry_score,
        key_metrics=key_metrics,
        bullets=bullets,
    )


def _as_of_date() -> date:
    return datetime.now(UTC).date() - timedelta(days=1)
