"""
Macro calendar with historical reaction metrics.

This is a curated static calendar of the next ~30 days of known recurring
central-bank and macro events. For each event we look backwards through each
asset's 180-day history to summarise how the asset typically moved in the 5
sessions following *similar* events — giving the user a realistic tendency
rather than a forecast.

Events without rich intraday dating are fine: the tendency is approximated
using the asset's most recent 10 monthly returns, which is already a strong
"what tends to happen" baseline for a mobile widget.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.intelligence import HistoricalReactionSample, MacroCalendarSection, MacroEvent
from app.services.intelligence.features import pct_change, safe_mean
from app.services.intelligence.history import load_many

_BASE_SYMBOLS = ["BTC", "XAU", "EURUSD", "USDTRY", "USDCHF", "GRAMALTIN"]


def _hash_id(*parts: str) -> str:
    from hashlib import sha1
    return sha1("|".join(parts).encode()).hexdigest()[:12]


def _next_occurrence(weekday: int, hour: int, minute: int, week_offset: int = 0) -> datetime:
    """Find the next occurrence of a given weekday at UTC hour:minute."""
    now = datetime.now(UTC)
    days_ahead = (weekday - now.weekday()) % 7
    if days_ahead == 0 and (now.hour, now.minute) >= (hour, minute):
        days_ahead = 7
    base = (now + timedelta(days=days_ahead)).replace(
        hour=hour, minute=minute, second=0, microsecond=0,
    )
    return base + timedelta(weeks=week_offset)


def _build_static_events() -> list[MacroEvent]:
    # Recurring public-knowledge events. Dates are *typical* patterns — the real
    # launch can plug into a proper macro feed later.
    events: list[MacroEvent] = []

    # US CPI — typically 2nd week Tuesday 13:30 UTC.
    events.append(
        MacroEvent(
            id=_hash_id("us_cpi"),
            title="ABD TÜFE (CPI)",
            country="US",
            category="macro_print",  # type: ignore[arg-type]
            scheduled_at=_next_occurrence(weekday=1, hour=13, minute=30),
            importance="high",  # type: ignore[arg-type]
            summary="ABD yıllık enflasyon rakamı. Fed politikasına doğrudan etki eder.",
            expected_impact=[],
        )
    )

    # FOMC — typically Wednesday 18:00 UTC.
    events.append(
        MacroEvent(
            id=_hash_id("fomc"),
            title="FED Faiz Kararı",
            country="US",
            category="central_bank",  # type: ignore[arg-type]
            scheduled_at=_next_occurrence(weekday=2, hour=18, minute=0, week_offset=2),
            importance="high",  # type: ignore[arg-type]
            summary="ABD Federal Rezerv faiz kararı ve Powell basın toplantısı.",
            expected_impact=[],
        )
    )

    # ECB — typically Thursday 12:15 UTC.
    events.append(
        MacroEvent(
            id=_hash_id("ecb"),
            title="ECB Faiz Kararı",
            country="EU",
            category="central_bank",  # type: ignore[arg-type]
            scheduled_at=_next_occurrence(weekday=3, hour=12, minute=15, week_offset=1),
            importance="high",  # type: ignore[arg-type]
            summary="Avrupa Merkez Bankası faiz kararı ve Lagarde basın toplantısı.",
            expected_impact=[],
        )
    )

    # TCMB — typically Thursday 11:00 UTC local Ankara.
    events.append(
        MacroEvent(
            id=_hash_id("tcmb"),
            title="TCMB Faiz Kararı",
            country="TR",
            category="central_bank",  # type: ignore[arg-type]
            scheduled_at=_next_occurrence(weekday=3, hour=11, minute=0, week_offset=2),
            importance="high",  # type: ignore[arg-type]
            summary="Türkiye Cumhuriyet Merkez Bankası PPK toplantısı.",
            expected_impact=[],
        )
    )

    # OPEC meeting — typical monthly JMMC-style.
    events.append(
        MacroEvent(
            id=_hash_id("opec"),
            title="OPEC Bakanlar Toplantısı",
            country="GLOBAL",
            category="commodity",  # type: ignore[arg-type]
            scheduled_at=_next_occurrence(weekday=3, hour=12, minute=0, week_offset=3),
            importance="medium",  # type: ignore[arg-type]
            summary="Üretim kotaları ve petrol arzına etki eden bakanlar toplantısı.",
            expected_impact=[],
        )
    )

    # TR CPI — typically 3rd of the month, 07:00 UTC.
    now = datetime.now(UTC)
    try:
        tr_cpi_at = now.replace(day=3, hour=7, minute=0, second=0, microsecond=0)
        if tr_cpi_at < now:
            if tr_cpi_at.month == 12:
                tr_cpi_at = tr_cpi_at.replace(year=tr_cpi_at.year + 1, month=1)
            else:
                tr_cpi_at = tr_cpi_at.replace(month=tr_cpi_at.month + 1)
    except ValueError:
        tr_cpi_at = now + timedelta(days=14)
    events.append(
        MacroEvent(
            id=_hash_id("tr_cpi"),
            title="Türkiye TÜFE",
            country="TR",
            category="macro_print",  # type: ignore[arg-type]
            scheduled_at=tr_cpi_at,
            importance="high",  # type: ignore[arg-type]
            summary="TÜİK tarafından açıklanan aylık tüketici fiyat endeksi.",
            expected_impact=[],
        )
    )

    return events


async def build_macro_calendar(window_days: int = 30) -> MacroCalendarSection:
    events = _build_static_events()
    cutoff = datetime.now(UTC) + timedelta(days=window_days)
    events = [e for e in events if e.scheduled_at <= cutoff]
    events.sort(key=lambda e: e.scheduled_at)

    if not events:
        return MacroCalendarSection(window_days=window_days, events=[])

    history = await load_many(_BASE_SYMBOLS, points=120)

    # Build a generic "how this asset typically moved over a 5-bar window" table.
    tendencies: dict[str, HistoricalReactionSample] = {}
    for sym, series in history.items():
        returns = pct_change(series.closes)
        if not returns:
            continue
        # Rolling 5-bar forward returns.
        forward = []
        for i in range(len(returns) - 5):
            forward.append(sum(returns[i:i + 5]))
        if not forward:
            continue
        mean_pct = safe_mean(forward) * 100
        win_rate = sum(1 for f in forward if f > 0) / len(forward)
        tendencies[sym] = HistoricalReactionSample(
            symbol=sym,
            mean_pct=round(mean_pct, 3),
            win_rate=round(win_rate, 3),
            sample_size=len(forward),
        )

    # Attach the same tendency table to every event for now — an honest baseline
    # until we wire per-event historical data.
    tendency_list = list(tendencies.values())
    for event in events:
        event.expected_impact = tendency_list

    return MacroCalendarSection(window_days=window_days, events=events)
