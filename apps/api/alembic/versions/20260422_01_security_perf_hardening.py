"""security and performance hardening primitives

Revision ID: 20260422_01
Revises: 20260220_01
Create Date: 2026-04-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260422_01"
down_revision: Union[str, None] = "20260220_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_webhook_receipts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_id", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("user_email", sa.String(length=255), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_billing_webhook_receipts")),
    )
    op.create_index(op.f("ix_billing_webhook_receipts_event_id"), "billing_webhook_receipts", ["event_id"], unique=True)
    op.create_index(op.f("ix_billing_webhook_receipts_event_type"), "billing_webhook_receipts", ["event_type"], unique=False)
    op.create_index(op.f("ix_billing_webhook_receipts_user_email"), "billing_webhook_receipts", ["user_email"], unique=False)

    op.create_table(
        "public_portfolio_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("share_token", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("portfolio_id", sa.UUID(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["portfolio_id"], ["portfolios.id"], name=op.f("fk_public_portfolio_snapshots_portfolio_id_portfolios")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_public_portfolio_snapshots_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_public_portfolio_snapshots")),
    )
    op.create_index(op.f("ix_public_portfolio_snapshots_share_token"), "public_portfolio_snapshots", ["share_token"], unique=True)
    op.create_index(op.f("ix_public_portfolio_snapshots_user_id"), "public_portfolio_snapshots", ["user_id"], unique=False)
    op.create_index(op.f("ix_public_portfolio_snapshots_portfolio_id"), "public_portfolio_snapshots", ["portfolio_id"], unique=False)
    op.create_index(op.f("ix_public_portfolio_snapshots_expires_at"), "public_portfolio_snapshots", ["expires_at"], unique=False)
    op.create_index(op.f("ix_public_portfolio_snapshots_revoked_at"), "public_portfolio_snapshots", ["revoked_at"], unique=False)

    op.create_index(
        "ix_transactions_portfolio_asset_type",
        "transactions",
        ["portfolio_id", "asset_id", "type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_portfolio_asset_type", table_name="transactions")

    op.drop_index(op.f("ix_public_portfolio_snapshots_revoked_at"), table_name="public_portfolio_snapshots")
    op.drop_index(op.f("ix_public_portfolio_snapshots_expires_at"), table_name="public_portfolio_snapshots")
    op.drop_index(op.f("ix_public_portfolio_snapshots_portfolio_id"), table_name="public_portfolio_snapshots")
    op.drop_index(op.f("ix_public_portfolio_snapshots_user_id"), table_name="public_portfolio_snapshots")
    op.drop_index(op.f("ix_public_portfolio_snapshots_share_token"), table_name="public_portfolio_snapshots")
    op.drop_table("public_portfolio_snapshots")

    op.drop_index(op.f("ix_billing_webhook_receipts_user_email"), table_name="billing_webhook_receipts")
    op.drop_index(op.f("ix_billing_webhook_receipts_event_type"), table_name="billing_webhook_receipts")
    op.drop_index(op.f("ix_billing_webhook_receipts_event_id"), table_name="billing_webhook_receipts")
    op.drop_table("billing_webhook_receipts")
