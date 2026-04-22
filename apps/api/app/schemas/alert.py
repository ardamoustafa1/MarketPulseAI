from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from app.models.alert import ConditionEnum

class AlertBase(BaseModel):
    asset_id: str
    target_price: Decimal
    condition: ConditionEnum
    base_price: Optional[Decimal] = None
    is_active: bool = True

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    target_price: Optional[Decimal] = None
    condition: Optional[ConditionEnum] = None
    is_active: Optional[bool] = None
    base_price: Optional[Decimal] = None

class AlertResponse(AlertBase):
    id: str
    user_id: str
    
    class Config:
        from_attributes = True

class AlertEventResponse(BaseModel):
    id: str
    alert_id: str
    triggered_price: Decimal
    
    class Config:
        from_attributes = True
