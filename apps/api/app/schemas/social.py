"""
Pydantic contracts for the "Social, Community & Virality" module.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ───────────────────────── Community Lists ─────────────────────────


class CommunityListItemView(BaseModel):
    symbol: str
    suggested_weight_pct: float | None = None
    position: int = 0

    model_config = ConfigDict(from_attributes=True)


class CommunityListView(BaseModel):
    id: str
    title: str
    subtitle: str | None = None
    description: str | None = None
    slug: str
    emoji: str | None = None
    hero_color: str | None = None
    category: Literal["curated", "user", "system"]
    theme: str | None = None
    curator_display_name: str | None = None
    is_featured: bool = False
    follower_count: int = 0
    item_count: int = 0
    items: list[CommunityListItemView] = Field(default_factory=list)
    share_url: str | None = None


class CommunityListCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    subtitle: str | None = Field(None, max_length=240)
    description: str | None = None
    emoji: str | None = Field(None, max_length=8)
    hero_color: str | None = Field(None, max_length=16)
    theme: str | None = None
    items: list[CommunityListItemView]


class FollowListPayload(BaseModel):
    mode: Literal["allocation", "watchlist", "paper_trades"] = "allocation"


# ───────────────────────── Copy Strategy ─────────────────────────


class CopyFollowView(BaseModel):
    id: str
    leader_user_id: str | None = None
    leader_display_name: str | None = None
    list_id: str | None = None
    list_title: str | None = None
    mode: Literal["allocation", "watchlist", "paper_trades"]
    last_synced_at: datetime | None = None
    snapshot: dict | None = None


class CopyStrategyPayload(BaseModel):
    leader_user_id: str | None = None
    list_id: str | None = None
    mode: Literal["allocation", "watchlist", "paper_trades"] = "allocation"


# ───────────────────────── Leaderboard ─────────────────────────


class LeaderboardEntryView(BaseModel):
    rank: int
    display_name: str
    score: float
    roi_pct: float
    win_count: int
    is_you: bool = False


class LeaderboardSeasonView(BaseModel):
    id: str
    index: int
    title: str
    league: Literal["overall", "crypto", "metals", "fx", "equity", "commodity"]
    starts_at: datetime
    ends_at: datetime
    is_active: bool
    days_remaining: int
    entries: list[LeaderboardEntryView] = Field(default_factory=list)
    your_rank: int | None = None


# ───────────────────────── Referral ─────────────────────────


class ReferralCodeView(BaseModel):
    code: str
    bonus_kind: Literal["silver_grams", "usdt_points", "gold_quarter"]
    bonus_amount: float
    claimed_count: int
    share_url: str


class ReferralClaimPayload(BaseModel):
    code: str = Field(..., min_length=4, max_length=16)


class ReferralClaimResult(BaseModel):
    accepted: bool
    bonus_kind: Literal["silver_grams", "usdt_points", "gold_quarter"]
    bonus_awarded: float
    owner_display_name: str | None = None


# ───────────────────────── Social proof (per asset) ─────────────────────────


class AssetSocialStats(BaseModel):
    symbol: str
    added_this_week: int
    bought_this_week: int
    sold_this_week: int
    net_momentum_pct: float
    in_watchlists: int
    generated_at: datetime


# ───────────────────────── Live Events ─────────────────────────


class LiveEventView(BaseModel):
    id: str
    title: str
    description: str | None = None
    kind: Literal[
        "live_stream", "market_open", "market_close",
        "fed_decision", "tcmb_decision", "ceremony",
    ]
    asset_class: str | None = None
    scheduled_at: datetime
    duration_minutes: int = 30
    host_display_name: str | None = None
    hero_image_url: str | None = None
    stream_url: str | None = None
    starts_in_seconds: int


# ───────────────────────── Share Cards ─────────────────────────


class ShareCardTheme(BaseModel):
    primary: str
    accent: str
    background: str
    text: str


class ShareCardMetric(BaseModel):
    label: str
    value: str
    tone: Literal["positive", "negative", "neutral"] = "neutral"


class ShareCardPayload(BaseModel):
    """
    Platform-agnostic payload used by the mobile ViewShot / social-card
    exporter. Tile layout, colors, headline, sub-headline, metrics,
    watermark and deep-link are all resolved server-side so both iOS
    and Android render identical frames.
    """

    id: str
    kind: Literal[
        "asset_snapshot", "portfolio_wrapped", "dca_result",
        "streak", "decision", "goal_progress", "compare",
    ]
    title: str
    subtitle: str | None = None
    headline: str
    subline: str | None = None
    badge: str | None = None
    source: str = "MarketPulse"
    asset_symbol: str | None = None
    asset_class: str | None = None
    theme: ShareCardTheme
    metrics: list[ShareCardMetric] = Field(default_factory=list)
    watermark_text: str
    deep_link: str
    generated_at: datetime


class ShareCardRequest(BaseModel):
    kind: Literal[
        "asset_snapshot", "portfolio_wrapped", "dca_result",
        "streak", "decision", "goal_progress", "compare",
    ]
    symbol: str | None = None
    extra_symbols: list[str] = Field(default_factory=list)
    decision: Literal["buy", "hold", "sell"] | None = None
    note: str | None = None
