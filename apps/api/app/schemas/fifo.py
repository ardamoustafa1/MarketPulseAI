from decimal import Decimal

from pydantic import BaseModel


class FifoRow(BaseModel):
    symbol: str
    fifo_realized_pnl: Decimal
    remaining_quantity: Decimal
    remaining_cost_basis_fifo: Decimal


class FifoSummaryResponse(BaseModel):
    portfolio_id: str
    rows: list[FifoRow]
