"""
Shared / Family portfolio membership.

Lightweight invite system — creator adds a row with an invite token.
Invitee can redeem via the token endpoint. Roles: owner / editor / viewer.
"""

from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.portfolio_powers import (
    SharedPortfolioMember,
    SharedPortfolioRole,
)
from app.models.user import User
from app.schemas.portfolio_powers import (
    SharedMemberPayload,
    SharedMemberView,
)


def _view(row: SharedPortfolioMember) -> SharedMemberView:
    return SharedMemberView(
        id=str(row.id),
        portfolio_id=str(row.portfolio_id),
        invitee_email=row.invitee_email,
        role=row.role.value if hasattr(row.role, "value") else str(row.role),
        accepted=bool(row.accepted_at),
        invite_token=row.invite_token,
        message=row.message,
        created_at=row.created_at,
    )


def invite_member(
    db: Session,
    portfolio: Portfolio,
    inviter: User,
    payload: SharedMemberPayload,
) -> SharedMemberView:
    token = secrets.token_urlsafe(24)[:64]
    row = SharedPortfolioMember(
        portfolio_id=portfolio.id,
        invitee_email=payload.invitee_email.lower().strip(),
        invited_by_user_id=inviter.id,
        role=SharedPortfolioRole(payload.role),
        invite_token=token,
        message=payload.message,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _view(row)


def list_members(db: Session, portfolio: Portfolio) -> list[SharedMemberView]:
    rows = (
        db.query(SharedPortfolioMember)
        .filter(SharedPortfolioMember.portfolio_id == portfolio.id)
        .order_by(SharedPortfolioMember.created_at.desc())
        .all()
    )
    return [_view(r) for r in rows]


def accept_invite(db: Session, user: User, token: str) -> SharedMemberView | None:
    from datetime import UTC, datetime

    row = (
        db.query(SharedPortfolioMember).filter(SharedPortfolioMember.invite_token == token).first()
    )
    if row is None:
        return None
    row.accepted_at = datetime.now(UTC)
    row.invitee_user_id = user.id
    db.commit()
    db.refresh(row)
    return _view(row)


def revoke_member(db: Session, portfolio: Portfolio, member_id: str) -> bool:
    row = (
        db.query(SharedPortfolioMember)
        .filter(
            SharedPortfolioMember.portfolio_id == portfolio.id,
            SharedPortfolioMember.id == member_id,
        )
        .first()
    )
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
