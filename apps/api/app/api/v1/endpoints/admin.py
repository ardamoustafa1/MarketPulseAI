from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_db
from app.models.alert import AiInsight
from app.models.audit import AdminAction
from app.models.user import User
from app.services.audit_service import AuditService

router = APIRouter()

class AdminActionListItem(BaseModel):
    id: str
    admin_id: str
    admin_email: str | None = None
    target_user_id: str | None = None
    action: str
    reason: str | None = None
    created_at: datetime


class AdminInsightListItem(BaseModel):
    id: str
    user_id: str
    user_email: str | None = None
    insight_type: str
    content: str
    created_at: datetime


@router.get("/")
def read_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    AuditService(db).log(
        action="admin.read_dashboard",
        entity_table="admin",
        entity_id="dashboard",
        details={},
        actor=current_admin,
    )
    return {"message": "admin endpoint"}


@router.get("/actions", response_model=list[AdminActionListItem])
def read_admin_actions(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 500))
    rows = (
        db.query(AdminAction, User.email)
        .outerjoin(User, User.id == AdminAction.admin_id)
        .order_by(AdminAction.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [
        AdminActionListItem(
            id=str(action.id),
            admin_id=str(action.admin_id),
            admin_email=admin_email,
            target_user_id=str(action.target_user_id) if action.target_user_id else None,
            action=action.action,
            reason=action.reason,
            created_at=action.created_at,
        )
        for action, admin_email in rows
    ]


@router.get("/insights", response_model=list[AdminInsightListItem])
def read_admin_insights(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 500))
    rows = (
        db.query(AiInsight, User.email)
        .outerjoin(User, User.id == AiInsight.user_id)
        .order_by(AiInsight.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [
        AdminInsightListItem(
            id=str(insight.id),
            user_id=str(insight.user_id),
            user_email=user_email,
            insight_type=insight.insight_type,
            content=insight.content,
            created_at=insight.created_at,
        )
        for insight, user_email in rows
    ]
