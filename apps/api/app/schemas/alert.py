from decimal import Decimal

from pydantic import BaseModel

from app.models.alert import ConditionEnum


class AlertBase(BaseModel):
    asset_id: str
    target_price: Decimal
    condition: ConditionEnum
    base_price: Decimal | None = None
    is_active: bool = True

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    target_price: Decimal | None = None
    condition: ConditionEnum | None = None
    is_active: bool | None = None
    base_price: Decimal | None = None

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


class AlertSuggestion(BaseModel):
    asset_symbol: str
    condition: ConditionEnum
    suggested_target_price: Decimal
    rationale: str
