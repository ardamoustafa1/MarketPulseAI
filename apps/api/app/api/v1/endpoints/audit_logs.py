from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()

class AuditLogListItem(BaseModel):
    id: str
    user_id: str | None = None
    actor_email: str | None = None
    action: str
    entity_table: str
    entity_id: str
    details: dict[str, Any] | None = None
    created_at: datetime


@router.get("/", response_model=list[AuditLogListItem])
def read_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 500))
    rows = (
        db.query(AuditLog, User.email)
        .outerjoin(User, User.id == AuditLog.user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [
        AuditLogListItem(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            actor_email=actor_email,
            action=log.action,
            entity_table=log.entity_table,
            entity_id=log.entity_id,
            details=log.details or {},
            created_at=log.created_at,
        )
        for log, actor_email in rows
    ]
