"""add portfolio powers tables (paper orders, rebalance, goals, shared members)

Revision ID: 20260423_02
Revises: 20260423_01
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260423_02"
down_revision: str | None = "20260423_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_PAPER_SIDE = postgresql.ENUM("buy", "sell", name="paperorderside", create_type=False)
_PAPER_TYPE = postgresql.ENUM(
    "market", "limit", "stop", "stop_limit", "oco",
    name="paperordertype", create_type=False,
)
_PAPER_STATUS = postgresql.ENUM(
    "pending", "triggered", "filled", "cancelled", "expired",
    name="paperorderstatus", create_type=False,
)
_GOAL_RISK = postgresql.ENUM(
    "conservative", "balanced", "aggressive",
    name="portfoliogoalriskmode", create_type=False,
)
_SHARED_ROLE = postgresql.ENUM(
    "owner", "editor", "viewer",
    name="sharedportfoliorole", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("buy", "sell", name="paperorderside").create(bind, checkfirst=True)
    postgresql.ENUM(
        "market", "limit", "stop", "stop_limit", "oco", name="paperordertype",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "pending", "triggered", "filled", "cancelled", "expired",
        name="paperorderstatus",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "conservative", "balanced", "aggressive", name="portfoliogoalriskmode",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "owner", "editor", "viewer", name="sharedportfoliorole",
    ).create(bind, checkfirst=True)

    op.create_table(
        "paper_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("asset_symbol", sa.String(length=32), nullable=False, index=True),
        sa.Column("side", _PAPER_SIDE, nullable=False),
        sa.Column("order_type", _PAPER_TYPE, nullable=False),
        sa.Column("status", _PAPER_STATUS, nullable=False, server_default="pending"),
        sa.Column("quantity", sa.Numeric(36, 18), nullable=False),
        sa.Column("limit_price", sa.Numeric(36, 18), nullable=True),
        sa.Column("stop_price", sa.Numeric(36, 18), nullable=True),
        sa.Column("take_profit_price", sa.Numeric(36, 18), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("filled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("oco_pair_id", sa.String(length=36), nullable=True, index=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "rebalance_targets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id"), nullable=False, index=True),
        sa.Column("target_weights", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("drift_tolerance_pct", sa.Numeric(6, 3), nullable=False, server_default="5"),
        sa.UniqueConstraint("user_id", "portfolio_id", name="uix_rebalance_user_portfolio"),
    )

    op.create_table(
        "portfolio_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id"), nullable=True, index=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("risk_mode", _GOAL_RISK, nullable=False, server_default="balanced"),
        sa.Column("target_composition", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("monthly_contribution", sa.Numeric(20, 4), nullable=True),
        sa.Column("contribution_currency", sa.String(length=10), nullable=False, server_default="TRY"),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "shared_portfolio_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id"), nullable=False, index=True),
        sa.Column("invitee_email", sa.String(length=255), nullable=False, index=True),
        sa.Column("invitee_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("role", _SHARED_ROLE, nullable=False, server_default="viewer"),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invite_token", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.UniqueConstraint("portfolio_id", "invitee_email", name="uix_shared_portfolio_invitee"),
    )


def downgrade() -> None:
    op.drop_table("shared_portfolio_members")
    op.drop_table("portfolio_goals")
    op.drop_table("rebalance_targets")
    op.drop_table("paper_orders")
    _SHARED_ROLE.drop(op.get_bind(), checkfirst=True)
    _GOAL_RISK.drop(op.get_bind(), checkfirst=True)
    _PAPER_STATUS.drop(op.get_bind(), checkfirst=True)
    _PAPER_TYPE.drop(op.get_bind(), checkfirst=True)
    _PAPER_SIDE.drop(op.get_bind(), checkfirst=True)
