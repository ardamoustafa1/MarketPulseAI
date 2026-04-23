from decimal import Decimal

from pydantic import BaseModel


class PortfolioBucket(BaseModel):
    id: str
    name: str
    is_default: bool


class AssetAllocation(BaseModel):
    symbol: str
    percentage: Decimal

class AssetPositionStatus(BaseModel):
    symbol: str
    quantity_held: Decimal
    average_buy_price: Decimal
    total_invested: Decimal
    current_value: Decimal
    
    unrealized_pnl: Decimal
    unrealized_pnl_percent: Decimal
    
    realized_pnl: Decimal
    has_live_price: bool = True
    is_stale_price: bool = False

    model_config = {
        "json_encoders": {Decimal: str}
    }

class PortfolioSummary(BaseModel):
    total_invested: Decimal
    total_current_value: Decimal
    total_unrealized_pnl: Decimal
    total_unrealized_pnl_percent: Decimal
    total_realized_pnl: Decimal
    valuation_complete: bool = True
    missing_price_positions: int = 0
    stale_price_positions: int = 0
    
    positions: list[AssetPositionStatus]
    allocation: list[AssetAllocation]

    model_config = {
        "json_encoders": {Decimal: str}
    }
