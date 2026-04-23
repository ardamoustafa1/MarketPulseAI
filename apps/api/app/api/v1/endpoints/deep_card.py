"""Deep Card API — `/api/v1/assets/{symbol}/deep-card` semantics.

Returns a polymorphic card selected by asset class. Used by the mobile
`AssetDetailScreen` to render class-specific "expert" modules.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.deep_card import DeepCardResponse
from app.services.deep_card.hub import build_deep_card

router = APIRouter()


@router.get("/{symbol}", response_model=DeepCardResponse)
async def deep_card(
    symbol: str,
    label: str | None = Query(
        default=None, description="Kullanıcıya gösterilecek etiket (opsiyonel)."
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DeepCardResponse:
    if not symbol or len(symbol) > 32:
        raise HTTPException(status_code=400, detail="Geçersiz sembol.")
    return await build_deep_card(symbol, label)
