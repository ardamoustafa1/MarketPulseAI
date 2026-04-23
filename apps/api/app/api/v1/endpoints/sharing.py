"""
Watchlist sharing via opaque, short-lived tokens stored in Redis.

Design goals:
- No DB migration. Token → snapshot mapping lives in Redis with a 30 day TTL.
- No PII leaks. Share payload contains only public fields (symbol, name, type).
- Idempotent per user per watchlist: POSTing twice reuses the same token.
"""
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.redis import get_redis_client
from app.models.alert import Watchlist, WatchlistItem
from app.models.asset import Asset
from app.models.user import User

router = APIRouter()

SHARE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
SHARE_PREFIX = "watchlist:share:"
SHARE_OWNER_PREFIX = "watchlist:share:owner:"


class SharedAsset(BaseModel):
    symbol: str
    name: str
    type: str


class SharePayload(BaseModel):
    token: str
    share_url: str
    owner_display_name: str
    asset_count: int
    assets: List[SharedAsset]
    expires_at: datetime


class CreateShareRequest(BaseModel):
    origin: str = "https://marketpulse.app"


def _serialize_payload(
    owner_display_name: str,
    assets: list[SharedAsset],
    expires_at: datetime,
) -> str:
    return json.dumps(
        {
            "owner_display_name": owner_display_name,
            "asset_count": len(assets),
            "assets": [a.model_dump() for a in assets],
            "expires_at": expires_at.isoformat(),
        }
    )


@router.post("/watchlist/share", response_model=SharePayload)
async def create_watchlist_share(
    body: CreateShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create (or reuse) a public token for the user's default watchlist."""
    watchlist = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.name == "Favorites")
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="No watchlist to share yet.")

    items = (
        db.query(Asset)
        .join(WatchlistItem, WatchlistItem.asset_id == Asset.id)
        .filter(WatchlistItem.watchlist_id == watchlist.id)
        .all()
    )
    if not items:
        raise HTTPException(status_code=400, detail="Your watchlist is empty.")

    assets = [
        SharedAsset(
            symbol=a.symbol,
            name=a.name,
            type=a.type.value if hasattr(a.type, "value") else str(a.type),
        )
        for a in items
    ]

    redis = get_redis_client()
    owner_key = f"{SHARE_OWNER_PREFIX}{current_user.id}:{watchlist.id}"
    existing_token = await redis.get(owner_key)

    raw_email = getattr(current_user, "email", "") or ""
    owner_name = (
        getattr(current_user, "full_name", None)
        or (raw_email.split("@")[0] if raw_email else "")
        or "Trader"
    )
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=SHARE_TTL_SECONDS)
    payload_body = _serialize_payload(owner_name, assets, expires_at)

    if existing_token:
        token = existing_token if isinstance(existing_token, str) else existing_token.decode()
        await redis.set(f"{SHARE_PREFIX}{token}", payload_body, ex=SHARE_TTL_SECONDS)
    else:
        token = secrets.token_urlsafe(12)
        await redis.set(f"{SHARE_PREFIX}{token}", payload_body, ex=SHARE_TTL_SECONDS)
        await redis.set(owner_key, token, ex=SHARE_TTL_SECONDS)

    origin = (body.origin or "https://marketpulse.app").rstrip("/")
    return SharePayload(
        token=token,
        share_url=f"{origin}/w/{token}",
        owner_display_name=owner_name,
        asset_count=len(assets),
        assets=assets,
        expires_at=expires_at,
    )


@router.get("/shared/watchlist/{token}", response_model=SharePayload)
async def get_shared_watchlist(token: str):
    """Public endpoint (no auth) — resolves a share token into a read-only payload."""
    redis = get_redis_client()
    raw = await redis.get(f"{SHARE_PREFIX}{token}")
    if not raw:
        raise HTTPException(status_code=404, detail="Share link expired or not found.")

    payload = json.loads(raw if isinstance(raw, str) else raw.decode())
    return SharePayload(
        token=token,
        share_url=f"https://marketpulse.app/w/{token}",
        owner_display_name=payload["owner_display_name"],
        asset_count=int(payload["asset_count"]),
        assets=[SharedAsset(**a) for a in payload["assets"]],
        expires_at=datetime.fromisoformat(payload["expires_at"]),
    )
