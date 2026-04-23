"""
Historical OHLC from Yahoo Finance chart API (v8) for line charts and comparisons.
"""
from __future__ import annotations

import logging
from collections.abc import Sequence

import httpx

from app.services.price.yahoo_provider import YAHOO_SYMBOL_MAP

logger = logging.getLogger(__name__)

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"

# UI range key -> (Yahoo range param, interval)
RANGE_QUERY: dict[str, tuple[str, str]] = {
    "1H": ("1d", "5m"),
    "1D": ("1d", "5m"),
    "1W": ("5d", "1h"),
    "1M": ("1mo", "1d"),
    "1Y": ("1y", "1wk"),
    "ALL": ("max", "1mo"),
}


def resolve_yahoo_ticker(symbol: str) -> str | None:
    return YAHOO_SYMBOL_MAP.get(symbol.strip().upper())


def _forward_fill_closes(closes: Sequence[float | None]) -> list[float]:
    out: list[float] = []
    last: float | None = None
    for c in closes:
        if c is not None and not (isinstance(c, float) and c != c):  # not NaN
            last = float(c)
        if last is not None:
            out.append(last)
        else:
            out.append(0.0)
    return out


async def fetch_close_history(symbol: str, range_key: str) -> tuple[list[int], list[float], str]:
    """
    Returns (timestamps_unix, close_prices, yahoo_ticker_used).
    For 1H, trims to the last ~60 minutes of 5m bars.
    """
    sym = symbol.strip().upper()
    ticker = resolve_yahoo_ticker(sym)
    if not ticker:
        raise ValueError(f"No Yahoo chart mapping for symbol: {sym}")

    rq = RANGE_QUERY.get(range_key.upper())
    if not rq:
        raise ValueError(f"Unsupported range: {range_key}")

    range_param, interval = rq
    params = {"range": range_param, "interval": interval}

    url = CHART_URL.format(ticker=ticker)
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            url,
            params=params,
            headers={"User-Agent": "MarketPulseAI/1.0"},
        )
        r.raise_for_status()
        data = r.json()

    result = (data.get("chart") or {}).get("result")
    if not result:
        meta = (data.get("chart") or {}).get("error") or "empty chart result"
        raise ValueError(str(meta))

    block = result[0]
    ts = block.get("timestamp") or []
    quotes = (block.get("indicators") or {}).get("quote") or [{}]
    closes_raw = (quotes[0] or {}).get("close") or []

    if not ts or not closes_raw:
        raise ValueError("Chart response missing timestamps or closes")

    closes = _forward_fill_closes(closes_raw)
    pairs = list(zip(ts, closes, strict=False))

    if range_key.upper() == "1H" and len(pairs) > 12:
        pairs = pairs[-13:]

    times = [p[0] for p in pairs]
    values = [p[1] for p in pairs]
    return times, values, ticker


def normalize_to_index100(values: Sequence[float]) -> list[float]:
    if not values:
        return []
    base = values[0]
    if base == 0:
        return [0.0 for _ in values]
    return [(v / base) * 100.0 for v in values]
