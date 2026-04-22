from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_admin
from app.models.audit import AuditLog
from app.models.portfolio import Portfolio, Transaction
from app.models.user import User
from app.models.push_device import PushDevice
from app.schemas.notifications import PushTokenRegister, PushTokenUnregister
from app.services.audit_service import AuditService

router = APIRouter()


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def register_push_token(
    body: PushTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or replace push token for the current user (Expo / FCM token string)."""
    existing = db.query(PushDevice).filter(PushDevice.token == body.token).first()
    if existing:
        existing.user_id = current_user.id
        existing.platform = body.platform or "unknown"
    else:
        db.add(
            PushDevice(
                user_id=current_user.id,
                token=body.token,
                platform=body.platform or "unknown",
            )
        )
    db.commit()
    return None


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def unregister_push_token(
    body: PushTokenUnregister = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(PushDevice)
        .filter(PushDevice.token == body.token, PushDevice.user_id == current_user.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return None


@router.get("/weekly-summary")
def weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    tx_count = (
        db.query(Transaction)
        .join(Portfolio, Portfolio.id == Transaction.portfolio_id)
        .filter(Portfolio.user_id == current_user.id, Transaction.created_at >= seven_days_ago)
        .count()
    )
    alert_count = (
        db.query(AuditLog)
        .filter(
            AuditLog.user_id == current_user.id,
            AuditLog.action.in_(["alerts.create", "alerts.triggered"]),
            AuditLog.created_at >= seven_days_ago,
        )
        .count()
    )
    insight_count = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id, AuditLog.action.like("insight.%"), AuditLog.created_at >= seven_days_ago)
        .count()
    )
    return {
        "period_days": 7,
        "transactions": tx_count,
        "alert_events": alert_count,
        "insight_events": insight_count,
        "headline": f"Bu hafta {tx_count} islem, {alert_count} alarm olayi ve {insight_count} icgoru olustu.",
    }


@router.post("/campaigns/reengagement")
def run_reengagement_campaign(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=14)
    active_recent = (
        db.query(AuditLog.user_id)
        .filter(AuditLog.user_id.isnot(None), AuditLog.created_at >= stale_cutoff)
        .distinct()
        .all()
    )
    active_ids = {str(row[0]) for row in active_recent if row and row[0]}
    all_push_users = db.query(PushDevice.user_id).distinct().all()
    target_ids = [str(row[0]) for row in all_push_users if row and row[0] and str(row[0]) not in active_ids]

    AuditService(db).log(
        action="notifications.reengagement.campaign.run",
        entity_table="notifications",
        entity_id="reengagement",
        details={"target_count": len(target_ids), "target_user_ids": target_ids[:200]},
        actor=current_admin,
    )
    return {
        "campaign": "reengagement",
        "target_count": len(target_ids),
        "message_template": "Portfoyunu guncellemek icin bugun 2 dakikani ayir. Yeni risk ozetini hazirladik.",
    }
