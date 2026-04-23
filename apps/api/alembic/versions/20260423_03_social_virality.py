"""add social virality tables (community lists, referrals, copy-strategy, leaderboard, live events)

Revision ID: 20260423_03
Revises: 20260423_02
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260423_03"
down_revision: str | None = "20260423_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_LIST_CATEGORY = postgresql.ENUM(
    "curated", "user", "system",
    name="communitylistcategory", create_type=False,
)
_LIST_THEME = postgresql.ENUM(
    "ai", "retirement", "inflation_shield", "halving", "turkey_mix",
    "meme", "commodities", "fx", "income", "growth",
    name="communitylisttheme", create_type=False,
)
_REF_BONUS = postgresql.ENUM(
    "silver_grams", "usdt_points", "gold_quarter",
    name="referralbonuskind", create_type=False,
)
_FOLLOW_MODE = postgresql.ENUM(
    "allocation", "watchlist", "paper_trades",
    name="strategyfollowmode", create_type=False,
)
_LEAGUE = postgresql.ENUM(
    "overall", "crypto", "metals", "fx", "equity", "commodity",
    name="leaderboardleague", create_type=False,
)
_EVENT_KIND = postgresql.ENUM(
    "live_stream", "market_open", "market_close",
    "fed_decision", "tcmb_decision", "ceremony",
    name="liveeventkind", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    for name, members in [
        ("communitylistcategory", ("curated", "user", "system")),
        ("communitylisttheme", (
            "ai", "retirement", "inflation_shield", "halving", "turkey_mix",
            "meme", "commodities", "fx", "income", "growth",
        )),
        ("referralbonuskind", ("silver_grams", "usdt_points", "gold_quarter")),
        ("strategyfollowmode", ("allocation", "watchlist", "paper_trades")),
        ("leaderboardleague", ("overall", "crypto", "metals", "fx", "equity", "commodity")),
        ("liveeventkind", (
            "live_stream", "market_open", "market_close",
            "fed_decision", "tcmb_decision", "ceremony",
        )),
    ]:
        postgresql.ENUM(*members, name=name).create(bind, checkfirst=True)

    op.create_table(
        "community_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("subtitle", sa.String(length=240), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("slug", sa.String(length=120), nullable=False, unique=True, index=True),
        sa.Column("emoji", sa.String(length=8), nullable=True),
        sa.Column("hero_color", sa.String(length=16), nullable=True),
        sa.Column("category", _LIST_CATEGORY, nullable=False),
        sa.Column("theme", _LIST_THEME, nullable=True),
        sa.Column("curator_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("follower_count", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "community_list_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("list_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("community_lists.id"),
                  nullable=False, index=True),
        sa.Column("asset_symbol", sa.String(length=32), nullable=False),
        sa.Column("suggested_weight_pct", sa.Numeric(6, 3), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("list_id", "asset_symbol", name="uix_community_list_symbol"),
    )

    op.create_table(
        "referral_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=False, unique=True),
        sa.Column("code", sa.String(length=16), nullable=False, unique=True, index=True),
        sa.Column("bonus_kind", _REF_BONUS, nullable=False, server_default="silver_grams"),
        sa.Column("bonus_amount", sa.Numeric(20, 6), nullable=False, server_default="0.1"),
        sa.Column("claimed_count", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "referral_claims",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("code", sa.String(length=16), sa.ForeignKey("referral_codes.code"), nullable=False, index=True),
        sa.Column("claimer_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=False, unique=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=False),
        sa.Column("bonus_awarded", sa.Numeric(20, 6), nullable=False, server_default="0"),
    )

    op.create_table(
        "strategy_follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("follower_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=False, index=True),
        sa.Column("leader_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=True, index=True),
        sa.Column("list_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("community_lists.id"),
                  nullable=True, index=True),
        sa.Column("mode", _FOLLOW_MODE, nullable=False, server_default="allocation"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.UniqueConstraint("follower_user_id", "leader_user_id", "list_id",
                            name="uix_follower_leader_list"),
    )

    op.create_table(
        "leaderboard_seasons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("league", _LEAGUE, nullable=False, server_default="overall"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("index", "league", name="uix_leaderboard_index_league"),
    )

    op.create_table(
        "leaderboard_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("season_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leaderboard_seasons.id"),
                  nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"),
                  nullable=False, index=True),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("score", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("roi_pct", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("win_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("season_id", "user_id", name="uix_leaderboard_season_user"),
    )

    op.create_table(
        "live_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", _EVENT_KIND, nullable=False),
        sa.Column("asset_class", sa.String(length=24), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("host_display_name", sa.String(length=80), nullable=True),
        sa.Column("hero_image_url", sa.String(length=500), nullable=True),
        sa.Column("stream_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("live_events")
    op.drop_table("leaderboard_entries")
    op.drop_table("leaderboard_seasons")
    op.drop_table("strategy_follows")
    op.drop_table("referral_claims")
    op.drop_table("referral_codes")
    op.drop_table("community_list_items")
    op.drop_table("community_lists")
    bind = op.get_bind()
    for name in (
        "liveeventkind", "leaderboardleague", "strategyfollowmode",
        "referralbonuskind", "communitylisttheme", "communitylistcategory",
    ):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
