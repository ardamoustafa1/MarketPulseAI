from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import uuid

class WatchlistAssetResponse(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    price: Optional[float] = None
    change_24h_percent: Optional[float] = None
    image_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class WatchlistResponse(BaseModel):
    id: str
    name: str
    user_id: str
    assets: List[WatchlistAssetResponse]

    model_config = ConfigDict(from_attributes=True)
