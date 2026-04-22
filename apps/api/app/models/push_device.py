from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class PushDevice(Base):
    """Stores Expo / native push tokens for alert notifications."""

    __tablename__ = "push_devices"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(Text, unique=True, nullable=False, index=True)
    platform = Column(String(32), nullable=False, default="unknown")

    user = relationship("User", backref="push_devices")
