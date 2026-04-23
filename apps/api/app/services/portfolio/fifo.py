"""
FIFO cost layering for realized P&amp;L (distinct from rolling average cost display).
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from decimal import Decimal

from app.services.portfolio.calculator import TransactionDTO, TransactionType


@dataclass
class FifoAssetSummary:
    symbol: str
    fifo_realized_pnl: Decimal
    remaining_quantity: Decimal
    remaining_cost_basis_fifo: Decimal


def fifo_process_symbol(transactions: list[TransactionDTO]) -> FifoAssetSummary:
    """
    Process chronological buy/sell transactions with FIFO sells.
    """
    if not transactions:
        return FifoAssetSummary(
            symbol="",
            fifo_realized_pnl=Decimal("0"),
            remaining_quantity=Decimal("0"),
            remaining_cost_basis_fifo=Decimal("0"),
        )

    symbol = transactions[0].symbol
    lots: deque[tuple[Decimal, Decimal]] = deque()  # (quantity, unit_cost)
    realized = Decimal("0")

    for t in transactions:
        if t.type == TransactionType.buy:
            if t.quantity <= 0 or t.price < 0:
                raise ValueError("Invalid buy")
            lots.append((t.quantity, t.price))
        else:
            if t.quantity <= 0 or t.price < 0:
                raise ValueError("Invalid sell")
            rem = t.quantity
            while rem > 0 and lots:
                lot_q, lot_p = lots[0]
                take = rem if rem <= lot_q else lot_q
                realized += take * (t.price - lot_p)
                new_q = lot_q - take
                if new_q == 0:
                    lots.popleft()
                else:
                    lots[0] = (new_q, lot_p)
                rem -= take
            if rem > 0:
                raise ValueError(f"FIFO sell exceeds holdings for {symbol}")

    remaining_q = sum((q for q, _ in lots), Decimal("0"))
    remaining_cost = sum((q * p for q, p in lots), Decimal("0"))

    return FifoAssetSummary(
        symbol=symbol,
        fifo_realized_pnl=realized,
        remaining_quantity=remaining_q,
        remaining_cost_basis_fifo=remaining_cost,
    )
