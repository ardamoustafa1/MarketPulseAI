from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class NormalizedPrice(BaseModel):
    """
    Standardize edilmiş, source'dan arındırılmış fiyat modeli.
    Front-end sadece bu modeli bilir ve tanır.
    """
    symbol: str  # e.g., 'BTC', 'XAU', 'USDTRY'
    price: Decimal
    change_24h: Optional[Decimal] = None
    asset_type: str # 'crypto', 'fiat', 'metal'
    last_updated_at: datetime
    source: str # e.g., 'binance', 'yahoo'
    is_stale: bool = False # Eğer cache'de varsa ama zamanı geçtiyse bu flag yanar
    
    # Critical Production Fix: JS cannot handle high precision floats securely. We must serialize Decimals to strings.
    model_config = {
        "json_encoders": {Decimal: str}
    }
