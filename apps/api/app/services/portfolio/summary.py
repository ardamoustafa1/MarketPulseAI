"""
Reusable helper for building a `PortfolioSummary` from persisted transactions.

Extracted from `endpoints/portfolio.py::_build_summary_for_portfolio` so other
feature surfaces (portfolio powers, intelligence, stress test) can reuse the
same canonical calculation path.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.schemas.portfolio import PortfolioSummary
from app.services.portfolio.calculator import (
    PortfolioCalculationEngine,
    TransactionDTO,
    TransactionType,
)
from app.services.price.cache import get_all_cached_prices


async def build_portfolio_summary(db: Session, portfolio: Portfolio) -> PortfolioSummary:
    rows = (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.transaction_date.asc(), Transaction.created_at.asc())
        .all()
    )

    tx_by_symbol: dict[str, list[TransactionDTO]] = {}
    for tx, symbol in rows:
        if tx.type not in (TransactionTypeEnum.buy, TransactionTypeEnum.sell):
            continue
        tx_type = (
            TransactionType.buy if tx.type == TransactionTypeEnum.buy else TransactionType.sell
        )
        tx_by_symbol.setdefault(symbol, []).append(
            TransactionDTO(
                symbol=symbol,
                type=tx_type,
                quantity=tx.quantity,
                price=tx.price or Decimal("0"),
            )
        )

    symbols = list(tx_by_symbol.keys())
    cached_prices = await get_all_cached_prices(symbols)

    positions = []
    for symbol in symbols:
        cached = cached_prices.get(symbol)
        has_live_price = cached is not None and not cached.is_stale
        is_stale_price = bool(cached and cached.is_stale)
        current_price = Decimal(str(cached.price)) if has_live_price else None
        positions.append(
            PortfolioCalculationEngine.calculate_asset_position(
                symbol=symbol,
                transactions=tx_by_symbol[symbol],
                current_price=current_price,
                has_live_price=has_live_price,
                is_stale_price=is_stale_price,
            )
        )

    return PortfolioCalculationEngine.calculate_portfolio_summary(positions)
