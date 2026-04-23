"""
Tax-lot tracking with FIFO / LIFO cost basis.

Reuses the existing FIFO engine (`services.portfolio.fifo`) and adds a LIFO
implementation. Returns open lots, realized events, and aggregate PnL metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.portfolio_powers import (
    RealizedEvent,
    TaxLot,
    TaxLotReport,
    TaxMethod,
)
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.price.cache import get_all_cached_prices


@dataclass
class _Lot:
    symbol: str
    quantity: Decimal
    cost_per_unit: Decimal
    acquired_at: datetime


async def build_tax_report(
    db: Session,
    user: User,
    method: TaxMethod = "fifo",
    portfolio: Portfolio | None = None,
) -> TaxLotReport:
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    rows = (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.transaction_date.asc(), Transaction.created_at.asc())
        .all()
    )

    # Group transactions by symbol
    tx_by_symbol: dict[str, list[tuple[Transaction]]] = {}
    for tx, symbol in rows:
        if tx.type not in (TransactionTypeEnum.buy, TransactionTypeEnum.sell):
            continue
        tx_by_symbol.setdefault(symbol, []).append(tx)

    # Run FIFO/LIFO per symbol
    open_lots: list[_Lot] = []
    realized: list[RealizedEvent] = []

    for symbol, txs in tx_by_symbol.items():
        lots_q: list[_Lot] = []  # modelled as a list/stack depending on method
        for tx in txs:
            qty = Decimal(str(tx.quantity))
            price = Decimal(str(tx.price)) if tx.price is not None else Decimal("0")
            if tx.type == TransactionTypeEnum.buy:
                lots_q.append(
                    _Lot(
                        symbol=symbol,
                        quantity=qty,
                        cost_per_unit=price,
                        acquired_at=tx.transaction_date,
                    )
                )
            elif tx.type == TransactionTypeEnum.sell:
                remaining = qty
                while remaining > 0 and lots_q:
                    lot = lots_q[0] if method == "fifo" else lots_q[-1]
                    take = min(remaining, lot.quantity)
                    cost_basis = float(take * lot.cost_per_unit)
                    proceeds = float(take * price)
                    realized.append(
                        RealizedEvent(
                            symbol=symbol,
                            sold_at=tx.transaction_date.date().isoformat(),
                            quantity=float(take),
                            proceeds=round(proceeds, 2),
                            cost_basis=round(cost_basis, 2),
                            realized_pnl=round(proceeds - cost_basis, 2),
                        )
                    )
                    lot.quantity -= take
                    remaining -= take
                    if lot.quantity <= 0:
                        if method == "fifo":
                            lots_q.pop(0)
                        else:
                            lots_q.pop()
        open_lots.extend([lot for lot in lots_q if lot.quantity > 0])

    # Price up open lots with current market data
    symbols = [lot.symbol for lot in open_lots]
    prices = await get_all_cached_prices(sorted(set(symbols))) if symbols else {}
    now = datetime.now(UTC)

    open_list: list[TaxLot] = []
    total_cost = 0.0
    total_upnl = 0.0
    for lot in open_lots:
        live = prices.get(lot.symbol)
        cur_price = float(live.price) if live else None
        cost_basis = float(lot.quantity * lot.cost_per_unit)
        upnl: float | None = None
        upnl_pct: float | None = None
        if cur_price is not None:
            market = cur_price * float(lot.quantity)
            upnl = market - cost_basis
            upnl_pct = (upnl / cost_basis * 100) if cost_basis > 0 else 0.0
        age = (now - lot.acquired_at).days if lot.acquired_at else 0
        open_list.append(
            TaxLot(
                symbol=lot.symbol,
                acquired_at=lot.acquired_at.date().isoformat() if lot.acquired_at else "",
                quantity=float(lot.quantity),
                cost_per_unit=float(lot.cost_per_unit),
                cost_basis=round(cost_basis, 2),
                current_price=round(cur_price, 4) if cur_price is not None else None,
                unrealized_pnl=round(upnl, 2) if upnl is not None else None,
                unrealized_pnl_pct=round(upnl_pct, 2) if upnl_pct is not None else None,
                age_days=max(0, age),
            )
        )
        total_cost += cost_basis
        if upnl is not None:
            total_upnl += upnl

    return TaxLotReport(
        method=method,
        open_lots=open_list,
        realized_events=realized,
        total_open_cost=round(total_cost, 2),
        total_unrealized_pnl=round(total_upnl, 2),
        total_realized_pnl=round(sum(e.realized_pnl for e in realized), 2),
        generated_at=now,
    )
