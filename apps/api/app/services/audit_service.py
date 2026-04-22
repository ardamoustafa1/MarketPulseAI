from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(self, action: str, entity_table: str, entity_id: str, details: dict[str, Any] | None = None, actor: User | None = None) -> None:
        entry = AuditLog(
            user_id=actor.id if actor else None,
            action=action,
            entity_table=entity_table,
            entity_id=entity_id,
            details=details or {},
        )
        self.db.add(entry)
        self.db.flush()
