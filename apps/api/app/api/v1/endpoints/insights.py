from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.plan_limits import insight_cooldown_for_user
from app.models.alert import AiInsight
from app.models.user import User
from app.schemas.insights import InsightGenerateRequest, InsightResponse
from app.services.llm.insight_generator import generate_insights_for_user, get_latest_insight

router = APIRouter()

@router.get("/", response_model=InsightResponse)
async def read_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch the latest generated AI insight for the user."""
    try:
        return await get_latest_insight(db, current_user)
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No insights generated yet. Use /generate to create one.",
        ) from None

@router.post("/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightGenerateRequest,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Force generate a new AI insight based on the latest snapshot data."""
    # Rate-limit: check cooldown since last generation
    latest = (
        db.query(AiInsight)
        .filter(AiInsight.user_id == current_user.id)
        .order_by(AiInsight.created_at.desc())
        .first()
    )
    if latest:
        cooldown = insight_cooldown_for_user(getattr(current_user, "subscription_tier", None))
        now = datetime.now(UTC)
        last_created = latest.created_at.replace(tzinfo=UTC) if latest.created_at.tzinfo is None else latest.created_at
        if now - last_created < cooldown:
            remaining = int((cooldown - (now - last_created)).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before generating new insights."
            )
    
    return await generate_insights_for_user(
        db, current_user, 
        include_portfolio=request.include_portfolio,
        include_watchlist=request.include_watchlist,
    )
