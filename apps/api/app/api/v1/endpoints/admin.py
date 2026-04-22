from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_db
from app.models.alert import AiInsight
from app.models.asset import Asset, AssetTypeEnum
from app.models.audit import AdminAction
from app.models.portfolio import Portfolio, Transaction
from app.models.user import User, RefreshToken
from app.services.audit_service import AuditService
from app.core.config import settings
from app.core.security import verify_totp_code

router = APIRouter()


def _require_step_up(request: Request) -> None:
    provided = request.headers.get("x-admin-step-up", "")
    provided_totp = request.headers.get("x-admin-step-up-totp", "")
    expected = settings.ADMIN_STEP_UP_TOKEN.strip()
    totp_secret = settings.ADMIN_STEP_UP_TOTP_SECRET.strip()
    if not expected or expected == "change-me-admin-step-up":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin step-up token is not configured.",
        )
    if not totp_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin step-up TOTP secret is not configured.",
        )
    if provided != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid admin step-up token.",
        )
    if not verify_totp_code(totp_secret, provided_totp, window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid admin step-up TOTP code.",
        )

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


class AdminUserListItem(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    subscription_tier: str
    created_at: datetime


class AdminUserUpdateRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    subscription_tier: str | None = None


class AdminAssetListItem(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    is_active: bool
    image_url: str | None = None
    created_at: datetime


class AdminAssetCreateRequest(BaseModel):
    symbol: str
    name: str
    type: str
    is_active: bool = True
    image_url: str | None = None


class AdminAssetUpdateRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    image_url: str | None = None


class AdminTransactionListItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    portfolio_id: str
    asset_id: str
    asset_symbol: str
    tx_type: str
    quantity: Decimal
    price: Decimal | None = None
    transaction_date: datetime
    created_at: datetime


class AdminAuditTimelineItem(BaseModel):
    id: str
    source: str
    actor: str | None = None
    action: str
    target: str
    details: dict[str, Any] | None = None
    created_at: datetime

class RevokeRefreshTokensRequest(BaseModel):
    user_id: str | None = None
    reason: str = "security_incident"


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


@router.get("/users", response_model=list[AdminUserListItem])
def read_admin_users(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 1000))
    rows = db.query(User).order_by(User.created_at.desc()).limit(safe_limit).all()
    return [
        AdminUserListItem(
            id=str(user.id),
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            subscription_tier=user.subscription_tier or "free",
            created_at=user.created_at,
        )
        for user in rows
    ]


@router.patch("/users/{user_id}", response_model=AdminUserListItem)
def update_admin_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    try:
        parsed_id = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")
    user = db.query(User).filter(User.id == parsed_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    before = {
        "role": user.role.value,
        "is_active": user.is_active,
        "subscription_tier": user.subscription_tier or "free",
    }

    if payload.role is not None:
        if payload.role not in {"user", "admin"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.subscription_tier is not None:
        user.subscription_tier = payload.subscription_tier
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService(db).log(
        action="admin.user.updated",
        entity_table="users",
        entity_id=str(user.id),
        details={"before": before, "after": {
            "role": user.role.value,
            "is_active": user.is_active,
            "subscription_tier": user.subscription_tier or "free",
        }},
        actor=current_admin,
    )
    return AdminUserListItem(
        id=str(user.id),
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        subscription_tier=user.subscription_tier or "free",
        created_at=user.created_at,
    )


@router.get("/assets", response_model=list[AdminAssetListItem])
def read_admin_assets(
    limit: int = 500,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 2000))
    rows = db.query(Asset).order_by(Asset.symbol.asc()).limit(safe_limit).all()
    return [
        AdminAssetListItem(
            id=str(asset.id),
            symbol=asset.symbol,
            name=asset.name,
            type=asset.type.value,
            is_active=asset.is_active,
            image_url=asset.image_url,
            created_at=asset.created_at,
        )
        for asset in rows
    ]


@router.post("/assets", response_model=AdminAssetListItem)
def create_admin_asset(
    payload: AdminAssetCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    normalized_symbol = payload.symbol.strip().upper()
    existing = db.query(Asset).filter(Asset.symbol == normalized_symbol).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Asset symbol already exists")
    if payload.type not in {"crypto", "fiat", "metal"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset type")
    asset = Asset(
        symbol=normalized_symbol,
        name=payload.name.strip(),
        type=AssetTypeEnum(payload.type),
        is_active=payload.is_active,
        image_url=payload.image_url,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    AuditService(db).log(
        action="admin.asset.created",
        entity_table="assets",
        entity_id=str(asset.id),
        details={"symbol": asset.symbol},
        actor=current_admin,
    )
    return AdminAssetListItem(
        id=str(asset.id),
        symbol=asset.symbol,
        name=asset.name,
        type=asset.type.value,
        is_active=asset.is_active,
        image_url=asset.image_url,
        created_at=asset.created_at,
    )


@router.patch("/assets/{asset_id}", response_model=AdminAssetListItem)
def update_admin_asset(
    asset_id: str,
    payload: AdminAssetUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    try:
        parsed_id = UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset id")
    asset = db.query(Asset).filter(Asset.id == parsed_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    before = {"name": asset.name, "is_active": asset.is_active, "image_url": asset.image_url}
    if payload.name is not None:
        asset.name = payload.name.strip()
    if payload.is_active is not None:
        asset.is_active = payload.is_active
    if payload.image_url is not None:
        asset.image_url = payload.image_url

    db.add(asset)
    db.commit()
    db.refresh(asset)
    AuditService(db).log(
        action="admin.asset.updated",
        entity_table="assets",
        entity_id=str(asset.id),
        details={"before": before, "after": {"name": asset.name, "is_active": asset.is_active, "image_url": asset.image_url}},
        actor=current_admin,
    )
    return AdminAssetListItem(
        id=str(asset.id),
        symbol=asset.symbol,
        name=asset.name,
        type=asset.type.value,
        is_active=asset.is_active,
        image_url=asset.image_url,
        created_at=asset.created_at,
    )


@router.get("/transactions", response_model=list[AdminTransactionListItem])
def read_admin_transactions(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 2000))
    tx_rows = (
        db.query(Transaction, Asset.symbol, User.id, User.email)
        .join(Asset, Asset.id == Transaction.asset_id)
        .join(Portfolio, Portfolio.id == Transaction.portfolio_id)
        .join(User, User.id == Portfolio.user_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    output: list[AdminTransactionListItem] = []
    for tx, symbol, user_id, user_email in tx_rows:
        output.append(
            AdminTransactionListItem(
                id=str(tx.id),
                user_id=str(user_id) if user_id else "unknown",
                user_email=user_email or "unknown",
                portfolio_id=str(tx.portfolio_id),
                asset_id=str(tx.asset_id),
                asset_symbol=symbol,
                tx_type=tx.type.value,
                quantity=tx.quantity,
                price=tx.price,
                transaction_date=tx.transaction_date,
                created_at=tx.created_at,
            )
        )
    return output


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_transaction(
    transaction_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _require_step_up(request)
    try:
        parsed_id = UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid transaction id")
    tx = db.query(Transaction).filter(Transaction.id == parsed_id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    AuditService(db).log(
        action="admin.transaction.deleted",
        entity_table="transactions",
        entity_id=str(parsed_id),
        details={},
        actor=current_admin,
    )
    return None


@router.get("/audit-timeline", response_model=list[AdminAuditTimelineItem])
def read_admin_audit_timeline(
    limit: int = 250,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    safe_limit = max(1, min(limit, 1000))
    audit_rows = (
        db.query(
            AdminAction.id,
            AdminAction.created_at,
            AdminAction.action,
            AdminAction.reason,
            User.email,
            AdminAction.target_user_id,
        )
        .outerjoin(User, User.id == AdminAction.admin_id)
        .order_by(AdminAction.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    from app.models.audit import AuditLog
    audit_log_rows = (
        db.query(AuditLog.id, AuditLog.created_at, AuditLog.action, AuditLog.entity_table, AuditLog.entity_id, AuditLog.details, User.email)
        .outerjoin(User, User.id == AuditLog.user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    timeline: list[AdminAuditTimelineItem] = []
    for row in audit_rows:
        timeline.append(
            AdminAuditTimelineItem(
                id=str(row.id),
                source="admin_action",
                actor=row.email,
                action=row.action,
                target=str(row.target_user_id) if row.target_user_id else "global",
                details={"reason": row.reason} if row.reason else {},
                created_at=row.created_at,
            )
        )
    for row in audit_log_rows:
        timeline.append(
            AdminAuditTimelineItem(
                id=str(row.id),
                source="audit_log",
                actor=row.email,
                action=row.action,
                target=f"{row.entity_table}:{row.entity_id}",
                details=row.details or {},
                created_at=row.created_at,
            )
        )
    timeline.sort(key=lambda item: item.created_at, reverse=True)
    return timeline[:safe_limit]


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


@router.post("/security/revoke-refresh-tokens")
def revoke_refresh_tokens(
    payload: RevokeRefreshTokensRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _require_step_up(request)
    target_user_id = None
    if payload.user_id:
        try:
            target_user_id = UUID(payload.user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    query = db.query(RefreshToken).filter(RefreshToken.revoked == False)
    if target_user_id:
        query = query.filter(RefreshToken.user_id == target_user_id)

    rows = query.all()
    for token_row in rows:
        token_row.revoked = True
        db.add(token_row)
    db.commit()

    AuditService(db).log(
        action="admin.security.revoke_refresh_tokens",
        entity_table="refresh_tokens",
        entity_id=str(target_user_id) if target_user_id else "all",
        details={"count": len(rows), "reason": payload.reason},
        actor=current_admin,
    )
    return {"revoked_count": len(rows), "scope": "user" if target_user_id else "all"}
