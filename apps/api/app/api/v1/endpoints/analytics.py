import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyticsEventBody(BaseModel):
    name: str
    properties: dict | None = None


@router.post("/event")
def track_event(
    body: AnalyticsEventBody,
    current_user: User = Depends(get_current_user),
):
    """Lightweight server-side funnel logging; forward to Datadog/Segment from infra if needed."""
    logger.info(
        "analytics_event user_id=%s name=%s props=%s",
        current_user.id,
        body.name,
        body.properties,
    )
    return {"ok": True}
