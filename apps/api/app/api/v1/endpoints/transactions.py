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
