
from pydantic import BaseModel, ConfigDict


class WatchlistAssetResponse(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    price: float | None = None
    change_24h_percent: float | None = None
    image_url: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class WatchlistResponse(BaseModel):
    id: str
    name: str
    user_id: str
    assets: list[WatchlistAssetResponse]

    model_config = ConfigDict(from_attributes=True)
