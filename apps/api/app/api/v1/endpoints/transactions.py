import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.services.portfolio.access import resolve_portfolio
from app.services.jobs.queue import enqueue_job, get_job_result, register_job_handler

router = APIRouter()


class TransactionCreateRequest(BaseModel):
    asset_id: Optional[str] = None
    asset_symbol: Optional[str] = None
    type: TransactionTypeEnum
    quantity: Decimal
    price: Decimal
    notes: Optional[str] = None
    transaction_date: datetime
    portfolio_id: Optional[UUID] = None


class TransactionResponse(BaseModel):
    id: str
    asset_id: str
    asset_symbol: str
    type: TransactionTypeEnum
    quantity: Decimal
    price: Decimal
    fee: Decimal
    notes: Optional[str]
    transaction_date: datetime
    created_at: datetime

    model_config = ConfigDict(json_encoders={Decimal: str})


class TaxReportSummary(BaseModel):
    country: str
    template: str
    transaction_count: int
    total_buy_notional: Decimal
    total_sell_notional: Decimal
    net_notional: Decimal


class TaxReportAsyncRequest(BaseModel):
    country: str = "TR"
    portfolio_id: Optional[UUID] = None


def _resolve_asset(db: Session, payload: TransactionCreateRequest) -> Asset:
    if payload.asset_symbol:
        by_symbol = db.query(Asset).filter(Asset.symbol.ilike(payload.asset_symbol)).first()
        if by_symbol:
            return by_symbol

    if payload.asset_id:
        by_id = db.query(Asset).filter(Asset.id == payload.asset_id).first()
        if by_id:
            return by_id

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Asset not found. Provide a valid symbol or asset_id.",
    )


def _to_response(tx: Transaction, symbol: str) -> TransactionResponse:
    return TransactionResponse(
        id=str(tx.id),
        asset_id=str(tx.asset_id),
        asset_symbol=symbol,
        type=tx.type,
        quantity=tx.quantity,
        price=tx.price or Decimal("0"),
        fee=Decimal("0"),
        notes=tx.notes,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


def _build_tax_report(rows, country: str) -> tuple[str, TaxReportSummary]:
    normalized_country = country.upper()
    template_map = {
        "TR": "TR_GIB_CRYPTO_TEMPLATE_V1",
        "US": "US_IRS_D8949_TEMPLATE_V1",
        "DE": "DE_PRIVATE_SALES_TEMPLATE_V1",
    }
    template = template_map.get(normalized_country, "GENERIC_TAX_TEMPLATE_V1")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["template", template])
    writer.writerow(["country", normalized_country])
    writer.writerow(["id", "asset_symbol", "type", "quantity", "price", "notional", "transaction_date_utc"])
    total_buy = Decimal("0")
    total_sell = Decimal("0")
    for tx, symbol in rows:
        notional = (tx.quantity * (tx.price or Decimal("0"))).quantize(Decimal("0.00000001"))
        if tx.type == TransactionTypeEnum.buy:
            total_buy += notional
        elif tx.type == TransactionTypeEnum.sell:
            total_sell += notional
        writer.writerow(
            [
                str(tx.id),
                symbol,
                tx.type.value,
                str(tx.quantity),
                str(tx.price or "0"),
                str(notional),
                tx.transaction_date.isoformat(),
            ]
        )
    summary = TaxReportSummary(
        country=normalized_country,
        template=template,
        transaction_count=len(rows),
        total_buy_notional=total_buy,
        total_sell_notional=total_sell,
        net_notional=total_sell - total_buy,
    )
    return buffer.getvalue(), summary


@router.get("", response_model=list[TransactionResponse])
@router.get("/", response_model=list[TransactionResponse])
def read_transactions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    rows = (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_to_response(tx, symbol) for tx, symbol in rows]


@router.get("/export/csv")
def export_transactions_csv(
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """CSV export for tax reporting (TR and other jurisdictions)."""
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    rows = (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.transaction_date.asc(), Transaction.created_at.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "portfolio_id",
            "asset_symbol",
            "type",
            "quantity",
            "price",
            "fee",
            "transaction_date_utc",
            "notes",
            "created_at_utc",
        ]
    )
    for tx, symbol in rows:
        writer.writerow(
            [
                str(tx.id),
                str(tx.portfolio_id),
                symbol,
                tx.type.value,
                str(tx.quantity),
                str(tx.price or "0"),
                "0",
                tx.transaction_date.isoformat(),
                tx.notes or "",
                tx.created_at.isoformat(),
            ]
        )

    data = buffer.getvalue()
    filename = f"marketpulse-transactions-{portfolio.id}.csv"
    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/tax-report")
def export_tax_report(
    country: str = Query("TR"),
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
    csv_data, summary = _build_tax_report(rows, country=country)
    filename = f"marketpulse-tax-report-{country.upper()}-{portfolio.id}.csv"
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Report-Template": summary.template,
        },
    )


@router.post("/report-jobs")
async def create_tax_report_job(
    payload: TaxReportAsyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, payload.portfolio_id)
    job_id = await enqueue_job(
        "tax_report",
        {
            "user_id": str(current_user.id),
            "portfolio_id": str(portfolio.id),
            "country": payload.country.upper(),
        },
    )
    return {"job_id": job_id, "status": "queued"}


@router.get("/report-jobs/{job_id}")
async def read_tax_report_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    result = await get_job_result(job_id)
    if not result:
        return {"status": "pending"}
    return result


async def _tax_report_job_handler(payload: dict) -> dict:
    # Job worker stores summary metadata and expects on-demand CSV retrieval via synchronous endpoint.
    return {
        "country": payload.get("country", "TR"),
        "portfolio_id": payload.get("portfolio_id"),
        "generated": True,
    }


register_job_handler("tax_report", _tax_report_job_handler)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    if payload.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than zero.")

    asset = _resolve_asset(db, payload)
    portfolio = resolve_portfolio(db, current_user.id, payload.portfolio_id)

    (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio.id)
        .with_for_update()
        .one()
    )

    if payload.type == TransactionTypeEnum.sell:
        total_buys = (
            db.query(Transaction)
            .filter(
                Transaction.portfolio_id == portfolio.id,
                Transaction.asset_id == asset.id,
                Transaction.type == TransactionTypeEnum.buy,
            )
            .all()
        )
        total_sells = (
            db.query(Transaction)
            .filter(
                Transaction.portfolio_id == portfolio.id,
                Transaction.asset_id == asset.id,
                Transaction.type == TransactionTypeEnum.sell,
            )
            .all()
        )
        quantity_held = sum((tx.quantity for tx in total_buys), Decimal("0")) - sum(
            (tx.quantity for tx in total_sells), Decimal("0")
        )
        if payload.quantity > quantity_held:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient holdings. Available: {quantity_held}",
            )

    normalized_transaction_date = payload.transaction_date
    if normalized_transaction_date.tzinfo is None:
        normalized_transaction_date = normalized_transaction_date.replace(tzinfo=timezone.utc)

    tx = Transaction(
        portfolio_id=portfolio.id,
        asset_id=asset.id,
        type=payload.type,
        price=payload.price,
        quantity=payload.quantity,
        transaction_date=normalized_transaction_date,
        notes=payload.notes,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return _to_response(tx, asset.symbol)
