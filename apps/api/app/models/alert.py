import enum

from sqlalchemy import JSON, Boolean, Column, Enum, ForeignKey, Numeric, String

from app.db.base_class import Base


class ConditionEnum(str, enum.Enum):
    greater_than = "gt"
    less_than = "lt"
    percentage_up = "pct_up"
    percentage_down = "pct_down"

class Watchlist(Base):
    __tablename__ = "watchlists"
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    watchlist_id = Column(ForeignKey("watchlists.id"), nullable=False, index=True)
    asset_id = Column(ForeignKey("assets.id"), nullable=False, index=True)

class Alert(Base):
    __tablename__ = "alerts"
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    asset_id = Column(ForeignKey("assets.id"), nullable=False, index=True)
    
    target_price = Column(Numeric(36, 18), nullable=False)
    base_price = Column(Numeric(36, 18), nullable=True) # Used for percentage calculations
    condition = Column(Enum(ConditionEnum), nullable=False)
    is_active = Column(Boolean, default=True)

class AlertEvent(Base):
    __tablename__ = "alert_events"
    alert_id = Column(ForeignKey("alerts.id"), nullable=False, index=True)
    triggered_price = Column(Numeric(36, 18), nullable=False)

class AiInsight(Base):
    __tablename__ = "ai_insights"
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    insight_type = Column(String(50), nullable=False) # e.g. "portfolio_risk", "market_summary"
    content = Column(String(2000), nullable=False)
    data_snapshot = Column(JSON, nullable=True) # Data sent to LLM for traceability
