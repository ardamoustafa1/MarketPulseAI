"""add subscription_tier to users

Revision ID: 20260220_01
Revises:
Create Date: 2026-02-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260220_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("subscription_tier", sa.String(length=32), server_default="free", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "subscription_tier")
