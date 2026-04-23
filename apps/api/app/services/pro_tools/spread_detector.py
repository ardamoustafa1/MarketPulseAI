"""
Cross-exchange / cross-venue spread detector.

Pulls the latest cached price (our aggregate) and synthesises realistic venue
quotes using a deterministic offset model. In production the venue offsets are
populated by dedicated collectors (BtcTurk, Paribu, Binance TR…); until those
collectors land this module provides a stable, professional preview surface so
the UI and alerting pipeline can be shipped end-to-end.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from app.schemas.pro_tools import (
    ExchangeCode,
    ExchangeQuote,
    SpreadOpportunity,
    SpreadView,
)
from app.services.price.cache import get_cached_price


def _venue_offsets(symbol: str) -> dict[ExchangeCode, float]:
    """Deterministic per-symbol offsets (±0.9%) to emulate venue dispersion."""
    digest = hashlib.sha1(symbol.upper().encode()).hexdigest()

    def slice_offset(start: int) -> float:
        raw = int(digest[start : start + 4], 16) / 0xFFFF
        return (raw - 0.5) * 0.018  # ±0.9 %

    return {
        "binance": slice_offset(0),
        "binance_tr": slice_offset(4),
        "btcturk": slice_offset(8),
        "paribu": slice_offset(12),
        "garanti_fx": slice_offset(16),
        "kapalicarsi": slice_offset(20),
    }


def _venues_for(symbol: str) -> list[ExchangeCode]:
    s = symbol.upper()
    crypto_tickers = {"BTC", "ETH", "USDT", "XRP", "SOL", "AVAX", "ADA", "DOGE", "DOT"}
    if any(k in s for k in crypto_tickers):
        return ["binance", "binance_tr", "btcturk", "paribu"]
    if any(k in s for k in ("USD", "EUR", "TRY", "GBP", "CHF", "JPY")):
        return ["garanti_fx", "binance_tr", "btcturk"]
    return ["kapalicarsi", "garanti_fx", "binance"]


async def build_spread_view(symbol: str) -> SpreadView:
    sym = symbol.upper().strip()
    live = await get_cached_price(sym)
    mid = float(live.price) if live else 0.0
    updated = live.last_updated_at if live and live.last_updated_at else datetime.now(UTC)
    venues = _venues_for(sym)
    offsets = _venue_offsets(sym)

    quotes: list[ExchangeQuote] = []
    for venue in venues:
        off = offsets.get(venue, 0.0)
        venue_mid = mid * (1 + off) if mid > 0 else 0.0
        half_spread = venue_mid * 0.0009  # 9 bps book width
        quotes.append(
            ExchangeQuote(
                exchange=venue,
                bid=round(venue_mid - half_spread, 6),
                ask=round(venue_mid + half_spread, 6),
                mid=round(venue_mid, 6),
                last_updated_at=updated,
            )
        )

    opportunities: list[SpreadOpportunity] = []
    for i, buy in enumerate(quotes):
        for sell in quotes[i + 1 :]:
            if buy.ask <= 0 or sell.bid <= 0:
                continue
            a_to_b = (sell.bid - buy.ask) / buy.ask * 100
            b_to_a = (buy.bid - sell.ask) / sell.ask * 100
            pairs = [
                (a_to_b, buy.exchange, sell.exchange, buy.ask, sell.bid),
                (b_to_a, sell.exchange, buy.exchange, sell.ask, buy.bid),
            ]
            for pct, buy_ex, sell_ex, buy_px, sell_px in pairs:
                tone = (
                    "positive"
                    if pct >= 0.30
                    else "neutral"
                    if pct >= 0
                    else "warning"
                )
                opportunities.append(
                    SpreadOpportunity(
                        symbol=sym,
                        buy_exchange=buy_ex,
                        sell_exchange=sell_ex,
                        buy_price=round(buy_px, 6),
                        sell_price=round(sell_px, 6),
                        spread_abs=round(sell_px - buy_px, 6),
                        spread_pct=round(pct, 4),
                        tone=tone,  # type: ignore[arg-type]
                    )
                )

    opportunities.sort(key=lambda o: o.spread_pct, reverse=True)
    best = opportunities[0].spread_pct if opportunities else 0.0

    return SpreadView(
        symbol=sym,
        quotes=quotes,
        opportunities=opportunities[:6],
        best_spread_pct=round(best, 4),
        generated_at=datetime.now(UTC),
    )
