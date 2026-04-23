import enum
from typing import Any

from pydantic import BaseModel, Field


class WSActionEnum(str, enum.Enum):
    subscribe = "subscribe"
    unsubscribe = "unsubscribe"
    ping = "ping"
    pong = "pong"
    price_update = "price_update"
    error = "error"

class WSMessageIn(BaseModel):
    action: WSActionEnum
    payload: dict | None = Field(default_factory=dict)
    
class WSMessageOut(BaseModel):
    event: WSActionEnum
    payload: Any
    timestamp: str # ISO format string for client-side syncing
