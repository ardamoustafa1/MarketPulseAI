from pydantic import BaseModel, Field
from typing import Optional, Any, List
import enum

class WSActionEnum(str, enum.Enum):
    subscribe = "subscribe"
    unsubscribe = "unsubscribe"
    ping = "ping"
    pong = "pong"
    price_update = "price_update"
    error = "error"

class WSMessageIn(BaseModel):
    action: WSActionEnum
    payload: Optional[dict] = Field(default_factory=dict)
    
class WSMessageOut(BaseModel):
    event: WSActionEnum
    payload: Any
    timestamp: str # ISO format string for client-side syncing
