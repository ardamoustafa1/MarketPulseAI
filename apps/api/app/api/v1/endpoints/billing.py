import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.config import settings
from app.core.security import verify_payload_signature
from app.core.plan_limits import insight_cooldown_for_user, max_alerts_for_user
from app.models.audit import AuditLog
from app.models.billing import BillingWebhookReceipt
from app.models.user import User
from app.schemas.billing import (
    BillingWebhookEvent,
    EntitlementResponse,
    SubscriptionStatusResponse,
    SubscriptionUpdateRequest,
)
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("/subscription", response_model=SubscriptionStatusResponse)
def read_subscription_status(
    current_user: User = Depends(get_current_user),
):
    return SubscriptionStatusResponse(
        user_id=str(current_user.id),
        subscription_tier=(current_user.subscription_tier or "free"),
        updated_at=current_user.updated_at,
    )


@router.patch("/subscription", response_model=SubscriptionStatusResponse)
def update_subscription_status(
    payload: SubscriptionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    previous_tier = current_user.subscription_tier or "free"
    current_user.subscription_tier = payload.subscription_tier
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    AuditService(db).log(
        action="billing.subscription_tier_updated",
        entity_table="users",
        entity_id=str(current_user.id),
        details={"from": previous_tier, "to": payload.subscription_tier},
        actor=current_user,
    )
    db.commit()

    return SubscriptionStatusResponse(
        user_id=str(current_user.id),
        subscription_tier=(current_user.subscription_tier or "free"),
        updated_at=current_user.updated_at,
    )


@router.get("/entitlements", response_model=EntitlementResponse)
def read_entitlements(
    current_user: User = Depends(get_current_user),
):
    tier = (current_user.subscription_tier or "free")
    return EntitlementResponse(
        user_id=str(current_user.id),
        subscription_tier=tier,  # type: ignore[arg-type]
        max_alerts=max_alerts_for_user(tier),
        insight_cooldown_seconds=int(insight_cooldown_for_user(tier).total_seconds()),
    )


@router.post("/webhook")
async def billing_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-signature"),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    if not verify_payload_signature(raw_body, settings.BILLING_WEBHOOK_SECRET, x_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid billing signature")

    try:
        payload_dict = json.loads(raw_body.decode("utf-8"))
        payload = BillingWebhookEvent(**payload_dict)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload")

    existing = (
        db.query(BillingWebhookReceipt)
        .filter(BillingWebhookReceipt.event_id == payload.event_id)
        .first()
    )
    if existing:
        return {"status": "duplicate_ignored"}

    user = db.query(User).filter(User.email == payload.user_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.event == "subscription.canceled":
        new_tier = "free"
    else:
        new_tier = payload.subscription_tier or "free"

    previous_tier = user.subscription_tier or "free"
    user.subscription_tier = new_tier
    db.add(user)
    db.add(
        BillingWebhookReceipt(
            event_id=payload.event_id.strip(),
            event_type=payload.event,
            user_email=payload.user_email,
            processed_at=datetime.now(timezone.utc),
        )
    )

    AuditService(db).log(
        action=f"billing.{payload.event}",
        entity_table="users",
        entity_id=str(user.id),
        details={"from": previous_tier, "to": new_tier, "user_email": payload.user_email},
        actor=None,
    )
    db.commit()
    db.refresh(user)
    return {"status": "ok"}


@router.get("/events")
def list_billing_events(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 500))
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.action.like("billing.%"))
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "action": row.action,
            "entity_table": row.entity_table,
            "entity_id": row.entity_id,
            "details": row.details or {},
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.patch("/users/{user_id}/subscription", response_model=SubscriptionStatusResponse)
def admin_update_user_subscription(
    user_id: str,
    payload: SubscriptionUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    previous_tier = user.subscription_tier or "free"
    user.subscription_tier = payload.subscription_tier
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService(db).log(
        action="billing.admin_subscription_tier_updated",
        entity_table="users",
        entity_id=str(user.id),
        details={"from": previous_tier, "to": payload.subscription_tier},
        actor=current_admin,
    )
    db.commit()

    return SubscriptionStatusResponse(
        user_id=str(user.id),
        subscription_tier=(user.subscription_tier or "free"),
        updated_at=user.updated_at,
    )
