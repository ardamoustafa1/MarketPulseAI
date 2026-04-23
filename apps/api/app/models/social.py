"""
Persistent models powering the "Social, Community & Virality" feature set.

Tables:
  * CommunityList / CommunityListItem — curated or user-authored basket lists
  * ReferralCode / ReferralClaim       — friend referral programme
  * StrategyFollow                     — copy-list / copy-strategy follow graph
  * LeaderboardSnapshot                — cached per-season standings
  * LiveEvent                          — analyst live stream + market ceremony calendar

All tables inherit the common CustomBase columns (id, created_at, updated_at).
No personally identifiable data is stored; everything is display-name + email.
"""

from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base_class import Base

# ───────────────────────────── Community Lists ──────────────────────────────


class CommunityListCategory(str, enum.Enum):
    curated = "curated"         # Managed by the MarketPulse editorial team.
    user = "user"               # Built & shared by end users.
    system = "system"           # Auto-generated (trending, seasonal).


class CommunityListTheme(str, enum.Enum):
    ai = "ai"
    retirement = "retirement"
    inflation_shield = "inflation_shield"
    halving = "halving"
    turkey_mix = "turkey_mix"
    meme = "meme"
    commodities = "commodities"
    fx = "fx"
    income = "income"
    growth = "growth"


class CommunityList(Base):
    __tablename__ = "community_lists"

    title = Column(String(120), nullable=False)
    subtitle = Column(String(240), nullable=True)
    description = Column(Text, nullable=True)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    emoji = Column(String(8), nullable=True)
    hero_color = Column(String(16), nullable=True)

    category = Column(Enum(CommunityListCategory), nullable=False, index=True)
    theme = Column(Enum(CommunityListTheme), nullable=True, index=True)
    curator_user_id = Column(ForeignKey("users.id"), nullable=True, index=True)

    is_public = Column(Boolean, nullable=False, default=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    follower_count = Column(Integer, nullable=False, default=0)


class CommunityListItem(Base):
    __tablename__ = "community_list_items"

    list_id = Column(ForeignKey("community_lists.id"), nullable=False, index=True)
    asset_symbol = Column(String(32), nullable=False, index=True)
    # Optional suggested weight (0..100). Null = equal weight.
    suggested_weight_pct = Column(Numeric(6, 3), nullable=True)
    position = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("list_id", "asset_symbol", name="uix_community_list_symbol"),
    )


# ─────────────────────────────── Referrals ──────────────────────────────────


class ReferralBonusKind(str, enum.Enum):
    silver_grams = "silver_grams"
    usdt_points = "usdt_points"
    gold_quarter = "gold_quarter"


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    owner_user_id = Column(ForeignKey("users.id"), nullable=False, unique=True, index=True)
    code = Column(String(16), nullable=False, unique=True, index=True)
    bonus_kind = Column(
        Enum(ReferralBonusKind),
        nullable=False,
        default=ReferralBonusKind.silver_grams,
    )
    bonus_amount = Column(Numeric(20, 6), nullable=False, default=0.1)
    claimed_count = Column(Integer, nullable=False, default=0)


class ReferralClaim(Base):
    __tablename__ = "referral_claims"

    code = Column(String(16), ForeignKey("referral_codes.code"), nullable=False, index=True)
    claimer_user_id = Column(ForeignKey("users.id"), nullable=False, unique=True, index=True)
    owner_user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    bonus_awarded = Column(Numeric(20, 6), nullable=False, default=0)


# ──────────────────────────── Copy-strategy ────────────────────────────────


class StrategyFollowMode(str, enum.Enum):
    allocation = "allocation"   # Mirror portfolio weight targets.
    watchlist = "watchlist"     # Mirror list membership only.
    paper_trades = "paper_trades"  # Mirror paper order stream.


class StrategyFollow(Base):
    __tablename__ = "strategy_follows"

    follower_user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    leader_user_id = Column(ForeignKey("users.id"), nullable=True, index=True)
    list_id = Column(ForeignKey("community_lists.id"), nullable=True, index=True)
    mode = Column(Enum(StrategyFollowMode), nullable=False, default=StrategyFollowMode.allocation)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    # Snapshot of mirrored weights at the moment of following.
    snapshot = Column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "follower_user_id", "leader_user_id", "list_id",
            name="uix_follower_leader_list",
        ),
    )


# ──────────────────────────── Leaderboard ──────────────────────────────────


class LeaderboardLeague(str, enum.Enum):
    overall = "overall"
    crypto = "crypto"
    metals = "metals"
    fx = "fx"
    equity = "equity"
    commodity = "commodity"


class LeaderboardSeason(Base):
    __tablename__ = "leaderboard_seasons"

    index = Column(Integer, nullable=False, index=True)
    title = Column(String(80), nullable=False)
    league = Column(
        Enum(LeaderboardLeague),
        nullable=False,
        default=LeaderboardLeague.overall,
        index=True,
    )
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    __table_args__ = (
        UniqueConstraint("index", "league", name="uix_leaderboard_index_league"),
    )


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    season_id = Column(ForeignKey("leaderboard_seasons.id"), nullable=False, index=True)
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    display_name = Column(String(80), nullable=False)
    score = Column(Numeric(18, 6), nullable=False, default=0)
    roi_pct = Column(Numeric(10, 4), nullable=False, default=0)
    win_count = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("season_id", "user_id", name="uix_leaderboard_season_user"),
    )


# ──────────────────────────── Live Events ──────────────────────────────────


class LiveEventKind(str, enum.Enum):
    live_stream = "live_stream"
    market_open = "market_open"
    market_close = "market_close"
    fed_decision = "fed_decision"
    tcmb_decision = "tcmb_decision"
    ceremony = "ceremony"


class LiveEvent(Base):
    __tablename__ = "live_events"

    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    kind = Column(Enum(LiveEventKind), nullable=False, index=True)
    asset_class = Column(String(24), nullable=True, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    host_display_name = Column(String(80), nullable=True)
    hero_image_url = Column(String(500), nullable=True)
    stream_url = Column(String(500), nullable=True)
