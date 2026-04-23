"""
"Today's Signal" engine.

For each asset we compute:
  * momentum score (short + medium term),
  * volatility z-score (current vs 90-day),
  * mean-reversion signal (distance from 20-day mean),
  * 24h change,
and combine them into a BUY/HOLD/SELL action with an explanation. We also
synthesize a *portfolio-level* macro signal so the user sees one tavsiye card.
"""
from __future__ import annotations

import logging
from collections.abc import Iterable
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.intelligence import AssetSignal, PortfolioSignal, TodaySignalSection
from app.services.intelligence.features import (
    annualized_vol,
    clamp,
    momentum,
    pct_change,
    safe_mean,
    safe_std,
    sigmoid,
    zscore,
)
from app.services.intelligence.history import CloseSeries, load_many
from app.services.price.cache import get_all_cached_prices

logger = logging.getLogger(__name__)

# A curated, cross-asset coverage list. Values chosen so every asset class
# shows up in the "Today" rail, matching the 30+ symbol coverage of the app.
DEFAULT_UNIVERSE = [
    "BTC", "ETH", "SOL", "BNB", "XRP",
    "XAU", "XAG", "XPT", "GRAMALTIN", "CEYREKYENI",
    "USDTRY", "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
]


def _action_from_score(score: float) -> tuple[str, float]:
    """Map score in [-1, 1] to (action, confidence)."""
    if score > 0.35:
        return "BUY", clamp(score, 0.5, 0.95)
    if score > 0.12:
        return "HOLD", clamp(0.5 + score, 0.5, 0.85)
    if score < -0.35:
        return "SELL", clamp(-score, 0.5, 0.95)
    if score < -0.12:
        return "HOLD", clamp(0.5 - score, 0.5, 0.85)
    return "HOLD", 0.55


def _rationale(
    symbol: str,
    momentum_pct: float,
    vol_z: float,
    mean_dev: float,
    change_24h: float | None,
) -> str:
    momentum_label = (
        "güçlü yukarı momentum" if momentum_pct > 0.05
        else "güçlü aşağı baskı" if momentum_pct < -0.05
        else "dengeli trend"
    )
    vol_label = (
        "yüksek oynaklık" if vol_z > 1.0
        else "sakin oynaklık" if vol_z < -0.5
        else "normal oynaklık"
    )
    mean_label = (
        "20 günlük ortalamanın üzerinde" if mean_dev > 0.01 else
        "20 günlük ortalamanın altında" if mean_dev < -0.01 else
        "20 günlük ortalamaya yakın"
    )
    parts = [
        f"{symbol}: {momentum_label}",
        vol_label,
        mean_label,
    ]
    if change_24h is not None:
        parts.append(f"24s: {change_24h:+.2f}%")
    return " · ".join(parts)


def _score_from_series(series: CloseSeries) -> tuple[float, float, float, float]:
    closes = series.closes
    if len(closes) < 30:
        return 0.0, 0.0, 0.0, 0.0

    mom_20 = momentum(closes, 20)
    mom_5 = momentum(closes, 5)
    returns = pct_change(closes)
    vol_full = safe_std(returns)
    vol_recent = safe_std(returns[-20:]) if len(returns) >= 20 else vol_full
    vol_z = zscore(vol_recent, returns[-90:] or returns)
    mean_20 = safe_mean(closes[-20:])
    mean_dev = (closes[-1] - mean_20) / mean_20 if mean_20 else 0.0

    # Combine: momentum + mild mean-reversion pressure − excess volatility penalty.
    raw = (
        1.35 * mom_20  # trend
        + 0.6 * mom_5  # short-term confirm
        - 0.8 * mean_dev if vol_z > 1.2 else -0.4 * mean_dev  # lean into reversion when calm
        - 0.25 * clamp(vol_z, -1.5, 2.5)
    )
    # Sigmoid-squash to [-1, 1] via (2σ − 1)
    score = 2 * sigmoid(raw * 6) - 1
    return score, mom_20, vol_z, mean_dev


async def build_today_signals(
    db: Session,
    user: User,
    extra_symbols: Iterable[str] | None = None,
) -> TodaySignalSection:
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.user_id == user.id,
            Portfolio.is_default.is_(True),
            Portfolio.deleted_at.is_(None),
        )
        .first()
    )

    portfolio_symbols: list[str] = []
    if portfolio is not None:
        portfolio_symbols = [
            row[0]
            for row in (
                db.query(Asset.symbol)
                .join(Transaction, Transaction.asset_id == Asset.id)
                .filter(
                    Transaction.portfolio_id == portfolio.id,
                    Transaction.type.in_([TransactionTypeEnum.buy, TransactionTypeEnum.sell]),
                )
                .distinct()
                .all()
            )
        ]

    universe = list(dict.fromkeys([*portfolio_symbols, *DEFAULT_UNIVERSE, *(extra_symbols or [])]))
    histories = await load_many(universe, points=180)
    live = await get_all_cached_prices(universe)

    asset_signals: list[AssetSignal] = []
    scores: list[tuple[str, float]] = []
    for sym in universe:
        series = histories.get(sym)
        if series is None:
            continue
        score, mom_20, vol_z, mean_dev = _score_from_series(series)
        action, confidence = _action_from_score(score)
        live_price = live.get(sym)
        change_24h = None
        if live_price and live_price.change_24h is not None:
            change_24h = float(live_price.change_24h)
        last_price = float(live_price.price) if live_price else series.last
        asset_type = (
            (live_price.asset_type if live_price else None) or _guess_asset_type(sym)
        )
        historical_hit = _historical_hit_rate(score, series)
        asset_signals.append(
            AssetSignal(
                symbol=sym,
                asset_type=asset_type,
                action=action,  # type: ignore[arg-type]
                confidence=float(round(confidence, 3)),
                rationale=_rationale(sym, mom_20, vol_z, mean_dev, change_24h),
                score=round(score, 3),
                momentum_pct=round(mom_20 * 100, 3),
                volatility_z=round(vol_z, 3),
                last_price=round(last_price, 6),
                change_24h_pct=round(change_24h, 3) if change_24h is not None else None,
                historical_hit_rate=historical_hit,
            )
        )
        scores.append((sym, score))

    portfolio_signal = _portfolio_signal(portfolio_symbols, scores, histories, db, portfolio)

    return TodaySignalSection(
        generated_at=datetime.now(UTC),
        portfolio=portfolio_signal,
        assets=asset_signals,
    )


_CRYPTO_PREFIXES: tuple[str, ...] = (
    "BTC", "ETH", "SOL", "ADA", "XRP", "BNB",
    "DOGE", "AVAX", "LTC", "DOT", "MATIC", "LINK",
)
_METAL_PREFIXES: tuple[str, ...] = (
    "XAU", "XAG", "XPT", "XPD", "GRAM", "ONS", "CEYREK", "YARIM",
    "TAMYENI", "TAMESKI", "ATA", "GREMSE", "AYAR", "GUMUS",
    "PLATIN", "PALADYUM", "HASALTIN",
)


def _guess_asset_type(symbol: str) -> str:
    symbol_upper = symbol.upper()
    if symbol_upper.startswith(_CRYPTO_PREFIXES):
        return "crypto"
    if symbol_upper.startswith(_METAL_PREFIXES):
        return "metal"
    return "fiat"


def _historical_hit_rate(score: float, series: CloseSeries) -> float | None:
    """
    Simple retrospective check: how often did a 20-day momentum of the same sign
    lead to a positive 5-day forward return in the last 120 days?
    """
    closes = series.closes
    if len(closes) < 60:
        return None
    sign = 1 if score > 0 else -1 if score < 0 else 0
    if sign == 0:
        return None
    wins = 0
    trials = 0
    for i in range(20, len(closes) - 5):
        base = closes[i - 20]
        if base == 0:
            continue
        mom_i = (closes[i] - base) / base
        if (mom_i > 0 and sign > 0) or (mom_i < 0 and sign < 0):
            trials += 1
            forward = closes[i + 5] - closes[i]
            if (forward > 0 and sign > 0) or (forward < 0 and sign < 0):
                wins += 1
    if trials < 15:
        return None
    return round(wins / trials, 3)


def _portfolio_signal(
    portfolio_symbols: list[str],
    scores: list[tuple[str, float]],
    histories: dict[str, CloseSeries],
    db: Session,
    portfolio: Portfolio | None,
) -> PortfolioSignal | None:
    if not scores:
        return None

    # Weight asset scores by current value when we know the user's holdings.
    weights: dict[str, float] = {}
    dominant_type: str | None = None
    if portfolio is not None and portfolio_symbols:
        holdings = _current_holdings(db, portfolio, portfolio_symbols)
        total = sum(holdings.values())
        if total > 0:
            weights = {sym: v / total for sym, v in holdings.items()}
            # Pick the largest single exposure as dominant type for messaging.
            top_symbol = max(holdings, key=holdings.get)
            dominant_type = _guess_asset_type(top_symbol)

    weighted_score = 0.0
    for sym, score in scores:
        weight = weights.get(sym)
        if weight is None:
            continue
        weighted_score += weight * score

    if not weights:
        # No holdings → use unweighted universe average as a general market tavsiye
        avg = sum(s for _, s in scores) / len(scores)
        weighted_score = avg

    net_bullish = sum(1 for _, s in scores if s > 0.2)
    net_bearish = sum(1 for _, s in scores if s < -0.2)

    portfolio_vol = None
    if weights:
        vol_values: list[float] = []
        for sym, weight in weights.items():
            series = histories.get(sym)
            if series is None:
                continue
            rets = pct_change(series.closes)
            vol_values.append(annualized_vol(rets[-60:]) * weight)
        portfolio_vol = round(sum(vol_values), 4) if vol_values else None

    if weighted_score > 0.25:
        action = "ADD_RISK"
        headline = "Bugün portföyüne risk ekleme güvenli görünüyor."
    elif weighted_score > 0.1:
        action = "HOLD"
        headline = "Portföyün dengede — bugün sakin bir takip günü."
    elif weighted_score < -0.25:
        action = "REDUCE_RISK"
        headline = "Bugün riskini azaltmayı düşün."
    elif weighted_score < -0.1:
        action = "PROTECT"
        headline = "Koruma modunda kal — volatilite yukarı seğirdi."
    else:
        action = "HOLD"
        headline = "Portföyün için güçlü bir sinyal yok — tut ve gözlemle."

    rationale = (
        f"Değerlendirdiğimiz {len(scores)} varlıktan {net_bullish} tanesi alıcı, "
        f"{net_bearish} tanesi satıcı yönünde. Portföy-ağırlıklı skor "
        f"{weighted_score:+.2f}"
    )
    if portfolio_vol is not None:
        rationale += f" · yıllıklandırılmış portföy oynaklığı ≈ {portfolio_vol*100:.1f}%"

    return PortfolioSignal(
        action=action,  # type: ignore[arg-type]
        confidence=clamp(0.5 + abs(weighted_score) * 0.8, 0.5, 0.95),
        headline=headline,
        rationale=rationale,
        net_bullish=net_bullish,
        net_bearish=net_bearish,
        dominant_asset_type=dominant_type,
        portfolio_volatility=portfolio_vol,
    )


def _current_holdings(db: Session, portfolio: Portfolio, symbols: list[str]) -> dict[str, float]:
    """
    Lightweight value-at-market estimate (quantity × last known price) — we
    don't need FIFO precision here because it only drives weighting.
    """
    qty_map: dict[str, Decimal] = {s: Decimal("0") for s in symbols}
    rows = (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(
            Transaction.portfolio_id == portfolio.id,
            Transaction.type.in_([TransactionTypeEnum.buy, TransactionTypeEnum.sell]),
        )
        .all()
    )
    for tx, sym in rows:
        qty = tx.quantity or Decimal("0")
        if tx.type == TransactionTypeEnum.buy:
            qty_map[sym] = qty_map.get(sym, Decimal("0")) + qty
        else:
            qty_map[sym] = qty_map.get(sym, Decimal("0")) - qty
    return {sym: float(qty) for sym, qty in qty_map.items() if qty > 0}
