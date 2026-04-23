"""
Consolidated Social, Community & Virality endpoints.

Mounted at /api/v1/social.

Resources:
  * /community-lists                   — curated + user-authored basket lists
  * /community-lists (POST)            — create a user list
  * /community-lists/{slug}            — public read
  * /copy/follow    (POST/GET/DELETE)  — follow strategies / lists
  * /leaderboard                       — paper trading season standings
  * /referral/code                     — my invite code
  * /referral/claim                    — redeem a code
  * /assets/{symbol}/social            — per-asset social counters
  * /live-events                       — upcoming streams + market ceremonies
  * /share-cards (POST)                — shareable card payload builder
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.social import LeaderboardLeague, ReferralBonusKind
from app.models.user import User
from app.schemas.social import (
    AssetSocialStats,
    CommunityListCreate,
    CommunityListView,
    CopyFollowView,
    CopyStrategyPayload,
    LeaderboardSeasonView,
    LiveEventView,
    ReferralClaimPayload,
    ReferralClaimResult,
    ReferralCodeView,
    ShareCardPayload,
    ShareCardRequest,
)
from app.services.social import (
    asset_social,
    community_lists,
    copy_strategy,
    leaderboard,
    live_events,
    referral,
    share_card,
)

router = APIRouter()


# ─────────── Community Lists ───────────


@router.get("/community-lists", response_model=list[CommunityListView])
async def community_list_index(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CommunityListView]:
    return community_lists.list_public(db)


@router.post("/community-lists", response_model=CommunityListView)
async def community_list_create(
    payload: CommunityListCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommunityListView:
    if len(payload.items) < 2:
        raise HTTPException(status_code=400, detail="En az 2 varlık gerekli.")
    return community_lists.create_user_list(db, user, payload)


@router.get("/community-lists/{slug}", response_model=CommunityListView)
async def community_list_detail(
    slug: str,
    db: Session = Depends(get_db),
) -> CommunityListView:
    view = community_lists.get_by_slug(db, slug)
    if view is None:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")
    return view


# ─────────── Copy strategy ───────────


@router.post("/copy/follow", response_model=CopyFollowView)
async def copy_follow(
    payload: CopyStrategyPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CopyFollowView:
    try:
        return copy_strategy.follow(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/copy/follow", response_model=list[CopyFollowView])
async def copy_follow_list(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CopyFollowView]:
    return copy_strategy.list_follows(db, user)


@router.delete("/copy/follow/{follow_id}")
async def copy_follow_delete(
    follow_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ok = copy_strategy.unfollow(db, user, follow_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Takip bulunamadı.")
    return {"unfollowed": True}


# ─────────── Leaderboard ───────────


@router.get("/leaderboard", response_model=LeaderboardSeasonView)
async def leaderboard_view(
    league: LeaderboardLeague = Query(default=LeaderboardLeague.overall),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeaderboardSeasonView:
    return await leaderboard.build_season(db, user, league=league, limit=limit)


# ─────────── Referral ───────────


@router.get("/referral/code", response_model=ReferralCodeView)
async def referral_code(
    bonus_kind: ReferralBonusKind = Query(default=ReferralBonusKind.silver_grams),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralCodeView:
    return referral.get_or_create_code(db, user, bonus_kind=bonus_kind)


@router.post("/referral/claim", response_model=ReferralClaimResult)
async def referral_claim(
    payload: ReferralClaimPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralClaimResult:
    try:
        return referral.claim(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ─────────── Asset social proof ───────────


@router.get("/assets/{symbol}/social", response_model=AssetSocialStats)
async def asset_social_stats(
    symbol: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AssetSocialStats:
    return await asset_social.build_asset_social(db, symbol.upper())


# ─────────── Live events ───────────


@router.get("/live-events", response_model=list[LiveEventView])
async def live_events_index(
    limit: int = Query(default=10, ge=3, le=30),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LiveEventView]:
    return live_events.list_events(db, limit=limit)


# ─────────── Share cards ───────────


@router.post("/share-cards", response_model=ShareCardPayload)
async def share_cards_build(
    payload: ShareCardRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShareCardPayload:
    return await share_card.build_share_card(db, user, payload)
