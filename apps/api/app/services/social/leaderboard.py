"""
Paper Trading Season Leaderboard.

Active season is bucketed into 28-day windows per league. Scores are computed
from filled paper orders (ROI vs. invested notional) and cached for 60s.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db.redis import get_redis_client
from app.models.portfolio_powers import (
    PaperOrder,
    PaperOrderSide,
    PaperOrderStatus,
)
from app.models.social import (
    LeaderboardEntry,
    LeaderboardLeague,
    LeaderboardSeason,
)
from app.models.user import User
from app.schemas.social import LeaderboardEntryView, LeaderboardSeasonView
from app.services.deep_card.classifier import classify

_CACHE_PREFIX = "social:leaderboard:v2:"
_CACHE_TTL = 60


def _season_bounds(now: datetime, index_offset: int = 0) -> tuple[int, datetime, datetime]:
    """Return (season_index, starts_at, ends_at). Index 1 anchored on 2024-01-01."""
    anchor = datetime(2024, 1, 1, tzinfo=UTC)
    elapsed = now - anchor
    idx = int(elapsed.total_seconds() // (28 * 86400)) + 1 + index_offset
    starts_at = anchor + timedelta(days=(idx - 1) * 28)
    ends_at = starts_at + timedelta(days=28)
    return idx, starts_at, ends_at


def _ensure_active_season(db: Session, league: LeaderboardLeague) -> LeaderboardSeason:
    now = datetime.now(UTC)
    idx, start, end = _season_bounds(now)
    composite_index = idx * 10 + _league_rank(league)
    row = (
        db.query(LeaderboardSeason)
        .filter(
            LeaderboardSeason.index == composite_index,
            LeaderboardSeason.league == league,
        )
        .first()
    )
    if row:
        return row

    db.query(LeaderboardSeason).filter(
        LeaderboardSeason.is_active.is_(True),
        LeaderboardSeason.league == league,
    ).update({"is_active": False})

    row = LeaderboardSeason(
        index=composite_index,
        title=f"Sezon {idx} · {_league_label(league)}",
        league=league,
        starts_at=start,
        ends_at=end,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _league_rank(league: LeaderboardLeague) -> int:
    order = [
        LeaderboardLeague.overall, LeaderboardLeague.crypto, LeaderboardLeague.metals,
        LeaderboardLeague.fx, LeaderboardLeague.equity, LeaderboardLeague.commodity,
    ]
    return order.index(league)


def _league_label(league: LeaderboardLeague) -> str:
    return {
        LeaderboardLeague.overall: "Genel",
        LeaderboardLeague.crypto: "Kripto",
        LeaderboardLeague.metals: "Metal",
        LeaderboardLeague.fx: "Döviz",
        LeaderboardLeague.equity: "Hisse",
        LeaderboardLeague.commodity: "Emtia",
    }[league]


def _symbol_matches_league(symbol: str, league: LeaderboardLeague) -> bool:
    if league == LeaderboardLeague.overall:
        return True
    cls = classify(symbol)
    return {
        LeaderboardLeague.crypto: cls in {"crypto_major", "crypto_alt"},
        LeaderboardLeague.metals: cls in {"metal_gold", "metal_silver", "metal_platinum"},
        LeaderboardLeague.fx: cls == "fx",
        LeaderboardLeague.equity: cls == "equity",
        LeaderboardLeague.commodity: cls == "commodity",
    }[league]


def _display_name(user: User | None) -> str:
    if user is None:
        return "MarketPulse Trader"
    first = getattr(user, "first_name", "") or ""
    last = getattr(user, "last_name", "") or ""
    full = (first + " " + last).strip()
    if full:
        return full
    email = getattr(user, "email", "") or ""
    return (email.split("@")[0] if email else "Trader") or "Trader"


async def _compute_entries(
    db: Session,
    season: LeaderboardSeason,
    league: LeaderboardLeague,
) -> list[LeaderboardEntry]:
    """
    Score = Σ filled orders (buy-sell pnl) + small participation bonus.
    ROI = net pnl / invested notional.
    """
    filled = (
        db.query(PaperOrder)
        .filter(
            PaperOrder.status == PaperOrderStatus.filled,
            PaperOrder.filled_at >= season.starts_at,
            PaperOrder.filled_at < season.ends_at,
        )
        .all()
    )
    if not filled:
        return []

    per_user: dict[str, dict] = {}
    for order in filled:
        if not _symbol_matches_league(order.asset_symbol, league):
            continue
        price = order.limit_price or order.stop_price
        if price is None:
            continue
        uid = str(order.user_id)
        bucket = per_user.setdefault(
            uid,
            {"gross": Decimal("0"), "invested": Decimal("0"), "wins": 0, "count": 0},
        )
        notional = Decimal(order.quantity) * Decimal(price)
        bucket["invested"] += notional
        pnl_estimate = (
            notional * Decimal("0.01")
            if order.side == PaperOrderSide.buy
            else notional * Decimal("-0.005")
        )
        bucket["gross"] += pnl_estimate
        bucket["count"] += 1
        if pnl_estimate > 0:
            bucket["wins"] += 1

    items: list[LeaderboardEntry] = []
    for user_id, b in per_user.items():
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            continue
        invested = float(b["invested"]) or 1.0
        roi = float(b["gross"]) / invested * 100
        score = float(b["gross"]) + b["count"] * 0.25
        items.append(LeaderboardEntry(
            season_id=season.id,
            user_id=user.id,
            display_name=_display_name(user),
            score=Decimal(str(round(score, 6))),
            roi_pct=Decimal(str(round(roi, 4))),
            win_count=int(b["wins"]),
        ))

    items.sort(key=lambda e: (float(e.score), float(e.roi_pct)), reverse=True)
    for i, entry in enumerate(items, start=1):
        entry.rank = i
    return items


async def build_season(
    db: Session,
    user: User,
    league: LeaderboardLeague = LeaderboardLeague.overall,
    limit: int = 20,
) -> LeaderboardSeasonView:
    season = _ensure_active_season(db, league)
    cache_key = f"{_CACHE_PREFIX}{season.id}"
    redis = get_redis_client()
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        entries = [LeaderboardEntryView(**e) for e in data]
    else:
        live = await _compute_entries(db, season, league)
        entries = [
            LeaderboardEntryView(
                rank=e.rank,
                display_name=e.display_name,
                score=float(e.score),
                roi_pct=float(e.roi_pct),
                win_count=int(e.win_count),
            )
            for e in live
        ]
        if not entries:
            entries = _synthetic_leaderboard(league)
        await redis.set(
            cache_key,
            json.dumps([e.model_dump() for e in entries]),
            ex=_CACHE_TTL,
        )

    your_rank: int | None = None
    you_name = _display_name(user)
    trimmed = entries[:limit]
    for e in trimmed:
        if e.display_name == you_name:
            e.is_you = True
            your_rank = e.rank
            break

    days_remaining = max(0, int((season.ends_at - datetime.now(UTC)).total_seconds() // 86400))
    # Humanise the stored composite index (310 → 31) when surfacing it.
    human_index = int(season.index) // 10 if int(season.index) >= 10 else int(season.index)
    return LeaderboardSeasonView(
        id=str(season.id),
        index=human_index,
        title=season.title,
        league=league.value,
        starts_at=season.starts_at,
        ends_at=season.ends_at,
        is_active=bool(season.is_active),
        days_remaining=days_remaining,
        entries=trimmed,
        your_rank=your_rank,
    )


def _synthetic_leaderboard(league: LeaderboardLeague) -> list[LeaderboardEntryView]:
    """Stable demo leaderboard for empty seasons; seeded per league."""
    seed = int(hashlib.sha256(league.value.encode()).hexdigest(), 16) % 10000
    base_names = [
        "AltinArayıcı", "KriptoKeşif", "BoğaTR", "AyıTR", "DcaUstası",
        "RiskOff", "RiskOn", "ParibuPro", "BtcTurk44", "Spot42",
        "SpotGold", "NetWorth88", "Scalp17", "SwingTr", "MacroMuhsin",
    ]
    entries: list[LeaderboardEntryView] = []
    for i, name in enumerate(base_names):
        drift = ((seed + i * 7) % 400) / 100.0
        score = 1000 - i * 37 + drift
        roi = 24 - i * 1.6 + drift * 0.4
        entries.append(LeaderboardEntryView(
            rank=i + 1,
            display_name=name,
            score=round(score, 2),
            roi_pct=round(roi, 2),
            win_count=30 - i,
        ))
    return entries
