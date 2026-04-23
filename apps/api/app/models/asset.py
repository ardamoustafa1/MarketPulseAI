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


class AssetTypeEnum(str, enum.Enum):
    crypto = "crypto"
    fiat = "fiat"
    metal = "metal"

class AssetCategory(Base):
    __tablename__ = "asset_categories"
    
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    
    assets = relationship("Asset", back_populates="category")

class Asset(Base):
    __tablename__ = "assets"
    
    category_id = Column(ForeignKey("asset_categories.id"), nullable=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(Enum(AssetTypeEnum), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    
    category = relationship("AssetCategory", back_populates="assets")
    price_ticks = relationship("PriceTick", back_populates="asset")

class PriceTick(Base):
    __tablename__ = "price_ticks"
    
    # TimescaleDB hypertable logic usually works better on standard integers/dates 
    # but regular PG is fine for standard tracking.
    asset_id = Column(ForeignKey("assets.id"), nullable=False, index=True)
    price = Column(Numeric(36, 18), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    asset = relationship("Asset", back_populates="price_ticks")
    
    __table_args__ = (
        UniqueConstraint('asset_id', 'timestamp', name='uix_asset_timestamp'),
    )
