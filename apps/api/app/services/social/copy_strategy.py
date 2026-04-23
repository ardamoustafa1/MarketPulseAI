"""
Follow another user's paper strategy or a community list. Pure "paper" mirror —
no real trades are executed. Snapshots are stored JSONB for transparency.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.social import (
    CommunityList,
    CommunityListItem,
    StrategyFollow,
    StrategyFollowMode,
)
from app.models.user import User
from app.schemas.social import CopyFollowView, CopyStrategyPayload


def _leader_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    first = getattr(user, "first_name", "") or ""
    last = getattr(user, "last_name", "") or ""
    full = (first + " " + last).strip()
    if full:
        return full
    email = getattr(user, "email", "") or ""
    return email.split("@")[0] if email else None


def _build_snapshot(db: Session, list_id: str | None) -> dict | None:
    if list_id is None:
        return None
    items = (
        db.query(CommunityListItem)
        .filter(CommunityListItem.list_id == list_id)
        .all()
    )
    if not items:
        return None
    total = sum(float(i.suggested_weight_pct or 0) for i in items)
    weights: dict[str, float] = {}
    for i in items:
        raw = float(i.suggested_weight_pct or 0)
        if total > 0 and raw > 0:
            weights[i.asset_symbol] = round(raw / total * 100, 3)
        else:
            weights[i.asset_symbol] = round(100 / len(items), 3)
    return {"weights": weights, "source": "community_list"}


def _view(db: Session, row: StrategyFollow) -> CopyFollowView:
    leader = (
        db.query(User).filter(User.id == row.leader_user_id).first()
        if row.leader_user_id else None
    )
    comm: CommunityList | None = None
    if row.list_id:
        comm = db.query(CommunityList).filter(CommunityList.id == row.list_id).first()
    return CopyFollowView(
        id=str(row.id),
        leader_user_id=str(row.leader_user_id) if row.leader_user_id else None,
        leader_display_name=_leader_display_name(leader),
        list_id=str(row.list_id) if row.list_id else None,
        list_title=comm.title if comm else None,
        mode=row.mode.value if hasattr(row.mode, "value") else str(row.mode),
        last_synced_at=row.last_synced_at,
        snapshot=row.snapshot if isinstance(row.snapshot, dict) else None,
    )


def follow(db: Session, user: User, payload: CopyStrategyPayload) -> CopyFollowView:
    if payload.leader_user_id is None and payload.list_id is None:
        raise ValueError("leader_user_id veya list_id gerekli.")
    if payload.leader_user_id == str(user.id):
        raise ValueError("Kendini takip edemezsin.")

    existing = (
        db.query(StrategyFollow)
        .filter(
            StrategyFollow.follower_user_id == user.id,
            StrategyFollow.leader_user_id == payload.leader_user_id,
            StrategyFollow.list_id == payload.list_id,
        )
        .first()
    )
    mode = StrategyFollowMode(payload.mode)
    snapshot = _build_snapshot(db, payload.list_id)
    now = datetime.now(UTC)

    if existing:
        existing.mode = mode
        existing.snapshot = snapshot
        existing.last_synced_at = now
    else:
        existing = StrategyFollow(
            follower_user_id=user.id,
            leader_user_id=payload.leader_user_id,
            list_id=payload.list_id,
            mode=mode,
            snapshot=snapshot,
            last_synced_at=now,
        )
        db.add(existing)

        if payload.list_id:
            comm = db.query(CommunityList).filter(CommunityList.id == payload.list_id).first()
            if comm is not None:
                comm.follower_count = int(comm.follower_count or 0) + 1

    db.commit()
    db.refresh(existing)
    return _view(db, existing)


def unfollow(db: Session, user: User, follow_id: str) -> bool:
    row = (
        db.query(StrategyFollow)
        .filter(StrategyFollow.id == follow_id, StrategyFollow.follower_user_id == user.id)
        .first()
    )
    if row is None:
        return False
    if row.list_id:
        comm = db.query(CommunityList).filter(CommunityList.id == row.list_id).first()
        if comm is not None:
            comm.follower_count = max(0, int(comm.follower_count or 0) - 1)
    db.delete(row)
    db.commit()
    return True


def list_follows(db: Session, user: User) -> list[CopyFollowView]:
    rows = (
        db.query(StrategyFollow)
        .filter(StrategyFollow.follower_user_id == user.id)
        .order_by(StrategyFollow.created_at.desc())
        .all()
    )
    return [_view(db, r) for r in rows]
