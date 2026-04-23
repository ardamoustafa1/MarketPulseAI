"""
"Canlı Veri" badge builder. Answers the mobile UI's question:
  *Where does this price come from, how fresh is it, and should the user trust it?*

Reuses the existing price cache (which already stores `last_updated_at` and a
provider hint) and maps the source into a human-readable label + tone.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.trust import DataSourceBadge
from app.services.price.cache import get_cached_price

_SOURCE_LABELS = {
    "binance": "Binance",
    "yahoo": "Yahoo Finance",
    "stooq": "Stooq",
    "alpha_vantage": "Alpha Vantage",
    "twelve_data": "Twelve Data",
    "exchange_rate_host": "ExchangeRate.host",
    "frankfurter": "Frankfurter (ECB)",
    "gold_api": "Gold API",
    "derived": "Hesaplanmış",
    "synthetic": "Demo verisi",
    "cache": "Önbellek",
}


def _freshness(age_seconds: int | None) -> tuple[str, str]:
    if age_seconds is None:
        return "stale", "warning"
    if age_seconds <= 20:
        return "live", "positive"
    if age_seconds <= 120:
        return "recent", "neutral"
    return "stale", "warning"


async def build_live_badge(symbol: str) -> DataSourceBadge:
    sym = symbol.upper().strip()
    live = await get_cached_price(sym)
    if live is None:
        return DataSourceBadge(
            symbol=sym,
            source_label="—",
            source_code="unknown",
            last_updated_at=None,
            age_seconds=None,
            freshness="stale",
            badge_tone="warning",
            disclosure="Bu sembol için şu anda canlı veri yok.",
        )

    source_code = (getattr(live, "source", "cache") or "cache").lower()
    label = _SOURCE_LABELS.get(source_code, source_code.title())
    updated = getattr(live, "last_updated_at", None)
    age_seconds: int | None = None
    if updated is not None:
        now = datetime.now(UTC)
        updated_utc = updated.replace(tzinfo=UTC) if updated.tzinfo is None else updated
        age_seconds = max(0, int((now - updated_utc).total_seconds()))
    freshness, tone = _freshness(age_seconds)
    disclosure = f"Kaynak: {label}."
    if age_seconds is not None:
        minutes = age_seconds // 60
        seconds = age_seconds % 60
        when = f"{minutes}d {seconds}s" if minutes else f"{seconds}s"
        disclosure = f"Kaynak: {label} · son güncelleme {when} önce."
    return DataSourceBadge(
        symbol=sym,
        source_label=label,
        source_code=source_code,
        last_updated_at=updated,
        age_seconds=age_seconds,
        freshness=freshness,  # type: ignore[arg-type]
        badge_tone=tone,  # type: ignore[arg-type]
        disclosure=disclosure,
    )
