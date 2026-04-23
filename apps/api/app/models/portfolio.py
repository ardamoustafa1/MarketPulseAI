import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class TransactionTypeEnum(str, enum.Enum):
    buy = "buy"
    sell = "sell"
    deposit = "deposit"
    withdrawal = "withdrawal"

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    positions = relationship("PortfolioPosition", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")

class PortfolioPosition(Base):
    """
    Materialized/Cached view of what a user actually holds inside a portfolio.
    Calculated via triggers or service layer after each transaction.
    """
    __tablename__ = "portfolio_positions"
    
    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    asset_id = Column(ForeignKey("assets.id"), nullable=False, index=True)
    
    # Needs to be ultra high precision due to shitcoins and specific blockchain decimals (up to 18 usually)
    quantity = Column(Numeric(36, 18), nullable=False, default=0)
    # Average buy-in price (Cost basis calculation)
    average_cost = Column(Numeric(36, 18), nullable=False, default=0)
    
    portfolio = relationship("Portfolio", back_populates="positions")
    
    __table_args__ = (
        UniqueConstraint('portfolio_id', 'asset_id', name='uix_portfolio_asset'),
    )

class Transaction(Base):
    __tablename__ = "transactions"
    
    portfolio_id = Column(ForeignKey("portfolios.id"), nullable=False, index=True)
    asset_id = Column(ForeignKey("assets.id"), nullable=False, index=True)
    
    type = Column(Enum(TransactionTypeEnum), nullable=False)
    # Price can be null if it's a direct deposit with unknown execution cost
    price = Column(Numeric(36, 18), nullable=True) 
    quantity = Column(Numeric(36, 18), nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False, index=True)
    notes = Column(String(500), nullable=True)
    
    portfolio = relationship("Portfolio", back_populates="transactions")
