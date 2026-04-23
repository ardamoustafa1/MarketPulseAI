import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.db.base_class import Base


class RoleEnum(str, enum.Enum):
    user = "user"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(Enum(RoleEnum), default=RoleEnum.user, nullable=False)
    is_active = Column(Boolean(), default=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete
    # free | pro — billing integration can update this
    subscription_tier = Column(String(32), nullable=False, server_default=text("'free'"))

    # End-user TOTP (RFC6238) — optional per-user second factor.
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean(), nullable=False, server_default=text("false"))
    totp_confirmed_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    device_info = Column(String(255))
    ip_address = Column(String(50))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    user = relationship("User", back_populates="sessions")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(512), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="refresh_tokens")
