"""
Live events + market ceremony schedule.

Bootstraps a rolling 6-week programme (Wednesday 21:00 analyst livestream,
BIST open/close, weekly macro) if the table is empty, so brand-new installs
see a meaningful agenda. Admins can override entries later.
"""

from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models.social import LiveEvent, LiveEventKind
from app.schemas.social import LiveEventView

_WEEKLY_ROTATION = ["metals", "crypto", "fx"]


def _next_weekday(reference: datetime, weekday: int, hour: int, minute: int = 0) -> datetime:
    """Return the next occurrence of the given weekday (Mon=0) at HH:MM UTC+3-ish UTC."""
    days_ahead = (weekday - reference.weekday()) % 7
    base = reference + timedelta(days=days_ahead)
    return datetime.combine(base.date(), time(hour=hour, minute=minute, tzinfo=UTC))


def ensure_default_schedule(db: Session) -> None:
    now = datetime.now(UTC)
    horizon = now + timedelta(days=42)
    existing = (
        db.query(LiveEvent)
        .filter(LiveEvent.scheduled_at >= now, LiveEvent.scheduled_at <= horizon)
        .count()
    )
    if existing >= 5:
        return

    cursor = now
    for week_idx in range(6):
        topic = _WEEKLY_ROTATION[week_idx % len(_WEEKLY_ROTATION)]
        wed = _next_weekday(cursor + timedelta(days=week_idx * 7), weekday=2, hour=18, minute=0)
        mon_close = _next_weekday(
            cursor + timedelta(days=week_idx * 7), weekday=0, hour=15, minute=0,
        )
        fri_open = _next_weekday(cursor + timedelta(days=week_idx * 7), weekday=4, hour=7, minute=0)

        db.add(LiveEvent(
            title=_live_title(topic),
            description="MarketPulse analist yayını — canlı soru-cevap.",
            kind=LiveEventKind.live_stream,
            asset_class=topic,
            scheduled_at=wed,
            duration_minutes=30,
            host_display_name="MarketPulse Studio",
        ))
        db.add(LiveEvent(
            title="BIST Kapanış Seremonisi",
            description="Günün kapanışı + haftanın en hareketli hisseleri.",
            kind=LiveEventKind.market_close,
            asset_class="equity",
            scheduled_at=mon_close,
            duration_minutes=10,
        ))
        db.add(LiveEvent(
            title="Kripto Günlük Açılışı",
            description="UTC gün başında BTC dominans + makro özeti.",
            kind=LiveEventKind.market_open,
            asset_class="crypto",
            scheduled_at=fri_open,
            duration_minutes=10,
        ))
    db.commit()


def _live_title(topic: str) -> str:
    return {
        "metals": "Canlı: Altın & Gümüş Derin Dalış",
        "crypto": "Canlı: Kripto Haftalık",
        "fx": "Canlı: Döviz & Reel Faiz Saati",
    }.get(topic, "Canlı Yayın")


def list_events(db: Session, limit: int = 10) -> list[LiveEventView]:
    ensure_default_schedule(db)
    now = datetime.now(UTC)
    rows = (
        db.query(LiveEvent)
        .filter(LiveEvent.scheduled_at >= now - timedelta(minutes=30))
        .order_by(LiveEvent.scheduled_at.asc())
        .limit(limit)
        .all()
    )
    out: list[LiveEventView] = []
    for r in rows:
        delta = int((r.scheduled_at - now).total_seconds())
        out.append(LiveEventView(
            id=str(r.id),
            title=r.title,
            description=r.description,
            kind=r.kind.value if hasattr(r.kind, "value") else str(r.kind),
            asset_class=r.asset_class,
            scheduled_at=r.scheduled_at,
            duration_minutes=int(r.duration_minutes or 30),
            host_display_name=r.host_display_name,
            hero_image_url=r.hero_image_url,
            stream_url=r.stream_url,
            starts_in_seconds=max(0, delta),
        ))
    return out
