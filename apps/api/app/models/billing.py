from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db.base_class import Base


class BillingWebhookReceipt(Base):
    __tablename__ = "billing_webhook_receipts"

    event_id = Column(String(128), nullable=False, unique=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=False)


class PublicPortfolioSnapshot(Base):
    __tablename__ = "public_portfolio_snapshots"

    share_token = Column(String(128), nullable=False, unique=True, index=True)
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)
