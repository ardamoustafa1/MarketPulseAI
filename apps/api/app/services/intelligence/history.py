"""
Historical close-price loader with Redis caching.

We fan-out to the existing Yahoo chart helper (already used by /charts) for live
data, then keep the last ~180 trading-day closes in Redis for cheap re-use by
the Intelligence Hub (regime, correlations, ratios, carry, macro reactions…).

Design principles:
- Deterministic synthetic fallback when Yahoo is unreachable (offline dev) so
  the UI never breaks in development — clearly flagged via `source`.
- Per-symbol TTL shorter than stooq/yahoo daily cadence to keep numbers fresh
  without hammering upstream. We cache for 30 minutes by default.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.db.redis import get_redis_client
from app.services.price.cache import get_cached_price
from app.services.price.yahoo_chart import fetch_close_history

logger = logging.getLogger(__name__)

HIST_CACHE_PREFIX = "marketpulse:intelligence:history:"
HIST_CACHE_TTL_SECONDS = 30 * 60  # 30 minutes

# Daily close series length used downstream. Long enough to compute 90/180d
# stats reliably while keeping payloads lean.
DEFAULT_HISTORY_POINTS = 180


@dataclass(slots=True)
class CloseSeries:
    symbol: str
    timestamps: list[int]
    closes: list[float]
    source: str  # "yahoo:1y" | "synthetic:current_price" | "cache"

    @property
    def last(self) -> float:
        return self.closes[-1] if self.closes else 0.0

    def tail(self, n: int) -> list[float]:
        if n <= 0 or not self.closes:
            return []
        return self.closes[-n:]


def _cache_key(symbol: str) -> str:
    return f"{HIST_CACHE_PREFIX}{symbol.upper()}"


async def _load_cached(symbol: str) -> CloseSeries | None:
    redis = get_redis_client()
    raw = await redis.get(_cache_key(symbol))
    if not raw:
        return None
    try:
        payload = json.loads(raw)
        return CloseSeries(
            symbol=payload["symbol"],
            timestamps=list(payload["timestamps"]),
            closes=[float(x) for x in payload["closes"]],
            source="cache",
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        logger.warning("intelligence.history cache corrupt for %s: %s", symbol, exc)
        return None


async def _store_cache(series: CloseSeries) -> None:
    redis = get_redis_client()
    payload = json.dumps(
        {
            "symbol": series.symbol,
            "timestamps": series.timestamps,
            "closes": series.closes,
            "stored_at": datetime.now(UTC).isoformat(),
        }
    )
    await redis.set(_cache_key(series.symbol), payload, ex=HIST_CACHE_TTL_SECONDS)


def _synthetic_series(symbol: str, last_price: float, points: int) -> CloseSeries:
    """
    Deterministic fallback series so downstream math is always defined when
    upstream providers are offline (Expo dev, CI, rate-limited).
    """
    if last_price <= 0:
        last_price = 100.0
    seed = int(hashlib.sha1(symbol.encode()).hexdigest()[:8], 16)
    closes: list[float] = []
    timestamps: list[int] = []
    now = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(points):
        # Reproducible "wave" per symbol: mixes 2 sine waves so all downstream
        # analytics (std, corr, returns) produce sensible non-zero numbers.
        phase = (seed + i) * 0.011
        wave = math.sin(phase) * 0.012 + math.sin(phase * 1.7) * 0.006
        drift = (i - points) / (points * 40.0)
        close = last_price * (1.0 + wave + drift)
        closes.append(round(close, 6))
        timestamps.append(int((now - timedelta(days=points - i)).timestamp()))
    # End the series exactly on the live price for UX consistency.
    if closes:
        closes[-1] = round(last_price, 6)
    return CloseSeries(
        symbol=symbol.upper(),
        timestamps=timestamps,
        closes=closes,
        source="synthetic:current_price",
    )


async def _fetch_remote(symbol: str, points: int) -> CloseSeries | None:
    try:
        timestamps, closes, _ = await fetch_close_history(symbol, "1Y")
    except (TimeoutError, ValueError, RuntimeError) as exc:
        logger.debug("intelligence.history yahoo miss for %s: %s", symbol, exc)
        return None
    except Exception as exc:  # noqa: BLE001 — any external failure is recoverable
        logger.warning("intelligence.history yahoo error for %s: %s", symbol, exc)
        return None
    if not closes:
        return None
    # Drop the 0.0 forward-fill sentinel values to keep math clean.
    paired = [(t, c) for t, c in zip(timestamps, closes, strict=False) if c > 0]
    if not paired:
        return None
    paired = paired[-points:]
    return CloseSeries(
        symbol=symbol.upper(),
        timestamps=[p[0] for p in paired],
        closes=[float(p[1]) for p in paired],
        source="yahoo:1y",
    )


async def load_close_series(symbol: str, points: int = DEFAULT_HISTORY_POINTS) -> CloseSeries:
    """
    Public API: returns a non-empty CloseSeries for the given symbol.
    Falls back to a synthetic series anchored on the current cached price when
    all remote sources fail.
    """
    cached = await _load_cached(symbol)
    if cached is not None and len(cached.closes) >= max(30, points // 3):
        return cached

    remote = await _fetch_remote(symbol, points)
    if remote is not None:
        await _store_cache(remote)
        return remote

    # Fallback: anchor on current spot price so synthetic path still matches reality.
    price_hint: float = 100.0
    try:
        live = await get_cached_price(symbol)
        if live is not None and live.price:
            price_hint = float(live.price)
    except Exception:  # noqa: BLE001
        pass
    return _synthetic_series(symbol, price_hint, points)


async def load_many(
    symbols: Iterable[str],
    points: int = DEFAULT_HISTORY_POINTS,
) -> dict[str, CloseSeries]:
    """Fetch close series concurrently for a batch of symbols."""
    symbol_list = [s.upper() for s in symbols]
    if not symbol_list:
        return {}
    results = await asyncio.gather(
        *[load_close_series(sym, points) for sym in symbol_list],
        return_exceptions=True,
    )
    out: dict[str, CloseSeries] = {}
    for sym, res in zip(symbol_list, results, strict=False):
        if isinstance(res, CloseSeries):
            out[sym] = res
        else:
            logger.warning("intelligence.history load failed for %s: %s", sym, res)
    return out
