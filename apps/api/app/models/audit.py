from sqlalchemy import Column, String, ForeignKey, JSON
from app.db.base_class import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    user_id = Column(ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False, index=True)
    entity_table = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False, index=True)
    details = Column(JSON, nullable=True)

class AdminAction(Base):
    __tablename__ = "admin_actions"
    
    admin_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False)
    reason = Column(String(1000), nullable=True)
