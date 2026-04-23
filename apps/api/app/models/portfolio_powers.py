"""
Persistent models for the "Portfolio Super Powers" feature set:

  * PaperOrder         — stop / limit / oco simulated orders
  * RebalanceTarget    — user-defined target weights per asset in a portfolio
  * PortfolioGoal      — multi-asset goals (weddings, houses, retirements…)
  * SharedPortfolioMember — collaborative access to a portfolio
"""

from __future__ import annotations

import enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base_class import Base


class PaperOrderSide(str, enum.Enum):
    buy = "buy"
    sell = "sell"


class PaperOrderType(str, enum.Enum):
    market = "market"
    limit = "limit"
    stop = "stop"
    stop_limit = "stop_limit"
    oco = "oco"  # one-cancels-the-other (pair: take_profit + stop_loss)


class PaperOrderStatus(str, enum.Enum):
    pending = "pending"
    triggered = "triggered"
    filled = "filled"
    cancelled = "cancelled"
    expired = "expired"


class PaperOrder(Base):
    __tablename__ = "paper_orders"

    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    asset_symbol = Column(String(32), nullable=False, index=True)

    side = Column(Enum(PaperOrderSide), nullable=False)
    order_type = Column(Enum(PaperOrderType), nullable=False)
    status = Column(Enum(PaperOrderStatus), nullable=False, default=PaperOrderStatus.pending)

    quantity = Column(Numeric(36, 18), nullable=False)
    limit_price = Column(Numeric(36, 18), nullable=True)
    stop_price = Column(Numeric(36, 18), nullable=True)
    take_profit_price = Column(Numeric(36, 18), nullable=True)

    triggered_at = Column(DateTime(timezone=True), nullable=True)
    filled_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    oco_pair_id = Column(String(36), nullable=True, index=True)  # identical on both legs
    notes = Column(String(500), nullable=True)


class RebalanceTarget(Base):
    __tablename__ = "rebalance_targets"

    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    # Dict like {"BTC": 30, "GRAMALTIN": 40, "USDTRY": 20, "SPY": 10}
    target_weights = Column(JSONB, nullable=False, default=dict)
    drift_tolerance_pct = Column(Numeric(6, 3), nullable=False, default=5)

    __table_args__ = (
        UniqueConstraint("user_id", "portfolio_id", name="uix_rebalance_user_portfolio"),
    )


class PortfolioGoalRiskMode(str, enum.Enum):
    conservative = "conservative"
    balanced = "balanced"
    aggressive = "aggressive"


class PortfolioGoal(Base):
    __tablename__ = "portfolio_goals"

    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=True, index=True)
    title = Column(String(120), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    risk_mode = Column(
        Enum(PortfolioGoalRiskMode), nullable=False, default=PortfolioGoalRiskMode.balanced
    )

    # Multi-asset target e.g. {"CEYREKYENI": 50, "BTC": 1.0, "USDTRY": 10000}
    target_composition = Column(JSONB, nullable=False, default=dict)
    monthly_contribution = Column(Numeric(20, 4), nullable=True)
    contribution_currency = Column(String(10), nullable=False, default="TRY")
    archived_at = Column(DateTime(timezone=True), nullable=True)


class SharedPortfolioRole(str, enum.Enum):
    owner = "owner"
    editor = "editor"
    viewer = "viewer"


class SharedPortfolioMember(Base):
    __tablename__ = "shared_portfolio_members"

    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    # Invitee may not yet be registered; store email + optional user_id once claimed.
    invitee_email = Column(String(255), nullable=False, index=True)
    invitee_user_id = Column(ForeignKey("users.id"), nullable=True, index=True)
    invited_by_user_id = Column(ForeignKey("users.id"), nullable=False, index=True)

    role = Column(Enum(SharedPortfolioRole), nullable=False, default=SharedPortfolioRole.viewer)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    invite_token = Column(String(64), nullable=False, unique=True, index=True)
    message = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("portfolio_id", "invitee_email", name="uix_shared_portfolio_invitee"),
    )
