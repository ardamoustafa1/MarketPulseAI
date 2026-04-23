"""add pro-tools tables (formula alerts + saved strategy rules)

Revision ID: 20260423_04
Revises: 20260423_03
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260423_04"
down_revision: str | None = "20260423_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "formula_alerts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("conditions", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("logical_operator", sa.String(8), nullable=False, server_default="and"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_push", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_email", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trigger_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_formula_alerts_user_id",
        "formula_alerts",
        ["user_id"],
    )

    op.create_table(
        "strategy_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("installment_amount", sa.Numeric(24, 6), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="TRY"),
        sa.Column("drawdown_trigger_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("breakout_trigger_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("drift_tolerance_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("ladder_steps", sa.Integer(), nullable=True),
        sa.Column("lookback_days", sa.Integer(), nullable=False, server_default="730"),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_report", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_strategy_rules_user_id",
        "strategy_rules",
        ["user_id"],
    )
    op.create_index(
        "ix_strategy_rules_symbol",
        "strategy_rules",
        ["symbol"],
    )


def downgrade() -> None:
    op.drop_index("ix_strategy_rules_symbol", table_name="strategy_rules")
    op.drop_index("ix_strategy_rules_user_id", table_name="strategy_rules")
    op.drop_table("strategy_rules")
    op.drop_index("ix_formula_alerts_user_id", table_name="formula_alerts")
    op.drop_table("formula_alerts")
