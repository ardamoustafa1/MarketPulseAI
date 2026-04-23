"""
API endpoints for the Trust & Compliance layer.

Mounted under /api/v1/trust.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.trust import (
    DataSourceBadge,
    DisclaimerView,
    SteelAccountView,
    TransparencyView,
)
from app.services.trust.disclaimer import build_disclaimer
from app.services.trust.live_badge import build_live_badge
from app.services.trust.steel_account import build_steel_account
from app.services.trust.transparency import build_transparency_view

router = APIRouter()


@router.get("/live-badge/{symbol}", response_model=DataSourceBadge)
async def live_badge(symbol: str) -> DataSourceBadge:
    return await build_live_badge(symbol)


@router.get("/transparency", response_model=TransparencyView)
def transparency() -> TransparencyView:
    return build_transparency_view()


@router.get("/disclaimer", response_model=DisclaimerView)
def disclaimer(locale: str = Query(default="tr")) -> DisclaimerView:
    return build_disclaimer(locale)


@router.get("/steel-account", response_model=SteelAccountView)
def steel_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SteelAccountView:
    return build_steel_account(db, user)
