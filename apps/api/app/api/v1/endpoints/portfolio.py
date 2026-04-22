import json
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
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
from app.db.redis import get_redis_client
from app.core.rate_limit import enforce_rate_limit, get_client_ip

router = APIRouter()
BENCHMARK_CACHE_TTL_SECONDS = 120
SUMMARY_CACHE_TTL_SECONDS = 60


async def _invalidate_portfolio_caches(user_id: UUID, portfolio_id: UUID) -> None:
    redis = get_redis_client()
    await redis.delete(f"portfolio:summary:{user_id}:{portfolio_id}")
    await redis.delete(f"portfolio:benchmark:{user_id}:{portfolio_id}")


def _portfolio_cache_version(db: Session, portfolio_id: UUID) -> str:
    latest_tx = (
        db.query(Transaction.created_at)
        .filter(Transaction.portfolio_id == portfolio_id)
        .order_by(Transaction.created_at.desc())
        .first()
    )
    if not latest_tx or not latest_tx[0]:
        return "empty"
    return latest_tx[0].isoformat()


class CreateBucketBody(BaseModel):
    name: str


class BenchmarkResponse(BaseModel):
    user_return_pct: Decimal
    market_median_return_pct: Decimal
    percentile_rank: int
    cohort_size: int


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
    cache_key = f"portfolio:summary:{current_user.id}:{portfolio.id}"
    cache_version = _portfolio_cache_version(db, portfolio.id)
    redis = get_redis_client()
    cached = await redis.get(cache_key)
    if cached:
        parsed = json.loads(cached)
        if parsed.get("version") == cache_version:
            return PortfolioSummary.model_validate(parsed.get("summary", {}))
    summary = await _build_summary_for_portfolio(db, portfolio)
    await redis.set(
        cache_key,
        json.dumps({"version": cache_version, "summary": summary.model_dump(mode="json")}),
        ex=SUMMARY_CACHE_TTL_SECONDS,
    )
    return summary


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


@router.get("/benchmark", response_model=BenchmarkResponse)
async def portfolio_benchmark(
    request: Request,
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = get_client_ip(request)
    await enforce_rate_limit(
        key=f"ratelimit:portfolio:benchmark:{current_user.id}:{ip}",
        max_requests=30,
        window_seconds=60,
        detail="Too many benchmark requests. Please retry shortly.",
    )
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    cache_key = f"portfolio:benchmark:{current_user.id}:{portfolio.id}"
    redis = get_redis_client()
    cached = await redis.get(cache_key)
    if cached:
        parsed = json.loads(cached)
        return BenchmarkResponse(
            user_return_pct=Decimal(str(parsed["user_return_pct"])),
            market_median_return_pct=Decimal(str(parsed["market_median_return_pct"])),
            percentile_rank=int(parsed["percentile_rank"]),
            cohort_size=int(parsed["cohort_size"]),
        )
    my_summary = await _build_summary_for_portfolio(db, portfolio)
    if my_summary.total_cost_basis == 0:
        raise HTTPException(status_code=400, detail="Benchmark requires non-zero cost basis.")
    user_return = ((my_summary.total_current_value - my_summary.total_cost_basis) / my_summary.total_cost_basis) * Decimal("100")

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.deleted_at.is_(None))
        .limit(200)
        .all()
    )
    returns: list[Decimal] = []
    for p in portfolios:
        summary = await _build_summary_for_portfolio(db, p)
        if summary.total_cost_basis == 0:
            continue
        pct = ((summary.total_current_value - summary.total_cost_basis) / summary.total_cost_basis) * Decimal("100")
        returns.append(pct)
    if not returns:
        response = BenchmarkResponse(
            user_return_pct=user_return.quantize(Decimal("0.01")),
            market_median_return_pct=Decimal("0.00"),
            percentile_rank=50,
            cohort_size=1,
        )
        await redis.set(
            cache_key,
            json.dumps({
                "user_return_pct": str(response.user_return_pct),
                "market_median_return_pct": str(response.market_median_return_pct),
                "percentile_rank": response.percentile_rank,
                "cohort_size": response.cohort_size,
            }),
            ex=BENCHMARK_CACHE_TTL_SECONDS,
        )
        return response
    sorted_returns = sorted(returns)
    mid = len(sorted_returns) // 2
    median = sorted_returns[mid]
    below_or_equal = sum(1 for r in sorted_returns if r <= user_return)
    percentile = int((below_or_equal / len(sorted_returns)) * 100)
    response = BenchmarkResponse(
        user_return_pct=user_return.quantize(Decimal("0.01")),
        market_median_return_pct=median.quantize(Decimal("0.01")),
        percentile_rank=max(1, min(99, percentile)),
        cohort_size=len(sorted_returns),
    )
    await redis.set(
        cache_key,
        json.dumps({
            "user_return_pct": str(response.user_return_pct),
            "market_median_return_pct": str(response.market_median_return_pct),
            "percentile_rank": response.percentile_rank,
            "cohort_size": response.cohort_size,
        }),
        ex=BENCHMARK_CACHE_TTL_SECONDS,
    )
    return response
