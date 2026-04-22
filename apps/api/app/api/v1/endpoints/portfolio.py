from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.fifo import FifoRow, FifoSummaryResponse
from app.schemas.portfolio import PortfolioBucket, PortfolioSummary
from app.services.portfolio.access import list_portfolios, resolve_portfolio
from app.services.portfolio.calculator import PortfolioCalculationEngine, TransactionDTO, TransactionType
from app.services.portfolio.fifo import fifo_process_symbol
from app.services.price.cache import get_all_cached_prices

router = APIRouter()


class CreateBucketBody(BaseModel):
    name: str


async def _build_summary_for_portfolio(db: Session, portfolio: Portfolio) -> PortfolioSummary:
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
        tx_type = TransactionType.buy if tx.type == TransactionTypeEnum.buy else TransactionType.sell
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


@router.get("/buckets", response_model=list[PortfolioBucket])
def list_portfolio_buckets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = list_portfolios(db, current_user.id)
    return [
        PortfolioBucket(id=str(p.id), name=p.name, is_default=bool(p.is_default))
        for p in rows
    ]


@router.post("/buckets", response_model=PortfolioBucket, status_code=status.HTTP_201_CREATED)
def create_portfolio_bucket(
    body: CreateBucketBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = body.name.strip()
    if len(name) < 1 or len(name) > 100:
        raise HTTPException(status_code=400, detail="Name must be 1–100 characters.")

    p = Portfolio(user_id=current_user.id, name=name, is_default=False)
    db.add(p)
    db.commit()
    db.refresh(p)
    return PortfolioBucket(id=str(p.id), name=p.name, is_default=bool(p.is_default))


@router.patch("/buckets/{portfolio_id}/default", response_model=PortfolioBucket)
def set_default_bucket(
    portfolio_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = resolve_portfolio(db, current_user.id, portfolio_id)
    others = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == current_user.id, Portfolio.deleted_at.is_(None))
        .all()
    )
    for o in others:
        o.is_default = o.id == target.id
    db.commit()
    db.refresh(target)
    return PortfolioBucket(id=str(target.id), name=target.name, is_default=True)


@router.get("", response_model=PortfolioSummary)
@router.get("/", response_model=PortfolioSummary)
async def read_portfolio(
    portfolio_id: Optional[UUID] = Query(None, description="Target portfolio; default bucket if omitted."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    return await _build_summary_for_portfolio(db, portfolio)


@router.get("/fifo", response_model=FifoSummaryResponse)
def fifo_summary(
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)

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
        tx_type = TransactionType.buy if tx.type == TransactionTypeEnum.buy else TransactionType.sell
        tx_by_symbol.setdefault(symbol, []).append(
            TransactionDTO(
                symbol=symbol,
                type=tx_type,
                quantity=tx.quantity,
                price=tx.price or Decimal("0"),
            )
        )

    out: list[FifoRow] = []
    for symbol, txs in tx_by_symbol.items():
        try:
            s = fifo_process_symbol(txs)
        except ValueError:
            continue
        out.append(
            FifoRow(
                symbol=symbol,
                fifo_realized_pnl=s.fifo_realized_pnl,
                remaining_quantity=s.remaining_quantity,
                remaining_cost_basis_fifo=s.remaining_cost_basis_fifo,
            )
        )

    return FifoSummaryResponse(portfolio_id=str(portfolio.id), rows=out)
