from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio


def get_or_create_default_portfolio(db: Session, user_id: UUID) -> Portfolio:
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user_id, Portfolio.is_default == True, Portfolio.deleted_at.is_(None))
        .first()
    )
    if portfolio:
        return portfolio

    portfolio = Portfolio(user_id=user_id, name="Default Portfolio", is_default=True)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


def resolve_portfolio(db: Session, user_id: UUID, portfolio_id: Optional[UUID]) -> Portfolio:
    if portfolio_id is not None:
        p = (
            db.query(Portfolio)
            .filter(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id,
                Portfolio.deleted_at.is_(None),
            )
            .first()
        )
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
        return p
    return get_or_create_default_portfolio(db, user_id)


def list_portfolios(db: Session, user_id: UUID) -> list[Portfolio]:
    return (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user_id, Portfolio.deleted_at.is_(None))
        .order_by(Portfolio.is_default.desc(), Portfolio.created_at.asc())
        .all()
    )
