"""Database models for the Pro Tools stack (formula alerts + saved strategies)."""

from __future__ import annotations

import enum

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)

from app.db.base_class import Base


class FormulaAlertLogicalOp(str, enum.Enum):
    and_ = "and"
    or_ = "or"


class FormulaAlert(Base):
    __tablename__ = "formula_alerts"

    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(String(500), nullable=True)
    conditions = Column(JSON, nullable=False, default=list)
    logical_operator = Column(
        String(8),
        nullable=False,
        default=FormulaAlertLogicalOp.and_.value,
    )
    is_active = Column(Boolean, nullable=False, default=True)
    notify_push = Column(Boolean, nullable=False, default=True)
    notify_email = Column(Boolean, nullable=False, default=False)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    trigger_count = Column(Integer, nullable=False, default=0, server_default="0")


class StrategyRuleKind(str, enum.Enum):
    dca_on_drawdown = "dca_on_drawdown"
    dca_on_breakout = "dca_on_breakout"
    rebalance_drift = "rebalance_drift"
    momentum_ladder = "momentum_ladder"


class StrategyRule(Base):
    __tablename__ = "strategy_rules"

    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    symbol = Column(String(32), nullable=False, index=True)
    installment_amount = Column(Numeric(24, 6), nullable=False)
    currency = Column(String(8), nullable=False, default="TRY")
    drawdown_trigger_pct = Column(Numeric(8, 4), nullable=True)
    breakout_trigger_pct = Column(Numeric(8, 4), nullable=True)
    drift_tolerance_pct = Column(Numeric(8, 4), nullable=True)
    ladder_steps = Column(Integer, nullable=True)
    lookback_days = Column(Integer, nullable=False, default=730, server_default="730")
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_report = Column(JSON, nullable=True)
