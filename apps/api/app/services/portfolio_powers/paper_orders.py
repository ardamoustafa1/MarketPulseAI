"""
Paper (simulated) orders supporting market, limit, stop, stop-limit and OCO.

The current live-trading system writes real `Transaction` rows. Paper orders
exist alongside as a separate table; they can optionally "materialize" into a
transaction when triggered (controlled from the endpoint).

Order matching logic is kept simple (deterministic, cache-based) — it fires
against the live price cache on-demand when `evaluate_pending_orders` is called.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.portfolio_powers import (
    PaperOrder,
    PaperOrderSide,
    PaperOrderStatus,
    PaperOrderType,
)
from app.models.user import User
from app.schemas.portfolio_powers import (
    PaperOrderList,
    PaperOrderPayload,
    PaperOrderView,
)
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.price.cache import get_cached_price


def _view(order: PaperOrder) -> PaperOrderView:
    return PaperOrderView(
        id=str(order.id),
        asset_symbol=order.asset_symbol,
        side=order.side.value if hasattr(order.side, "value") else str(order.side),
        order_type=order.order_type.value
        if hasattr(order.order_type, "value")
        else str(order.order_type),
        status=order.status.value if hasattr(order.status, "value") else str(order.status),
        quantity=float(order.quantity),
        limit_price=(float(order.limit_price) if order.limit_price is not None else None),
        stop_price=(float(order.stop_price) if order.stop_price is not None else None),
        take_profit_price=(
            float(order.take_profit_price) if order.take_profit_price is not None else None
        ),
        triggered_at=order.triggered_at,
        filled_at=order.filled_at,
        expires_at=order.expires_at,
        oco_pair_id=order.oco_pair_id,
        created_at=order.created_at,
        notes=order.notes,
    )


def submit_order(
    db: Session,
    user: User,
    payload: PaperOrderPayload,
    portfolio: Portfolio | None = None,
) -> list[PaperOrder]:
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    expires_at = None
    if payload.expires_in_hours and payload.expires_in_hours > 0:
        expires_at = datetime.now(UTC) + timedelta(hours=payload.expires_in_hours)

    orders: list[PaperOrder] = []
    if payload.order_type == "oco":
        # Create TWO orders sharing the same pair id
        if payload.take_profit_price is None or payload.stop_price is None:
            raise ValueError("OCO emir için take_profit_price ve stop_price zorunlu.")
        pair_id = uuid.uuid4().hex
        tp = PaperOrder(
            portfolio_id=portfolio.id,
            user_id=user.id,
            asset_symbol=payload.asset_symbol.upper(),
            side=PaperOrderSide(payload.side),
            order_type=PaperOrderType.limit,
            status=PaperOrderStatus.pending,
            quantity=Decimal(str(payload.quantity)),
            limit_price=Decimal(str(payload.take_profit_price)),
            expires_at=expires_at,
            oco_pair_id=pair_id,
            notes=payload.notes,
        )
        sl = PaperOrder(
            portfolio_id=portfolio.id,
            user_id=user.id,
            asset_symbol=payload.asset_symbol.upper(),
            side=PaperOrderSide(payload.side),
            order_type=PaperOrderType.stop,
            status=PaperOrderStatus.pending,
            quantity=Decimal(str(payload.quantity)),
            stop_price=Decimal(str(payload.stop_price)),
            expires_at=expires_at,
            oco_pair_id=pair_id,
            notes=payload.notes,
        )
        db.add(tp)
        db.add(sl)
        db.commit()
        db.refresh(tp)
        db.refresh(sl)
        orders = [tp, sl]
    else:
        if payload.order_type == "limit" and payload.limit_price is None:
            raise ValueError("Limit emir için limit_price zorunlu.")
        if payload.order_type in ("stop", "stop_limit") and payload.stop_price is None:
            raise ValueError("Stop emirleri için stop_price zorunlu.")
        order = PaperOrder(
            portfolio_id=portfolio.id,
            user_id=user.id,
            asset_symbol=payload.asset_symbol.upper(),
            side=PaperOrderSide(payload.side),
            order_type=PaperOrderType(payload.order_type),
            status=PaperOrderStatus.pending,
            quantity=Decimal(str(payload.quantity)),
            limit_price=(
                Decimal(str(payload.limit_price)) if payload.limit_price is not None else None
            ),
            stop_price=(
                Decimal(str(payload.stop_price)) if payload.stop_price is not None else None
            ),
            take_profit_price=(
                Decimal(str(payload.take_profit_price))
                if payload.take_profit_price is not None
                else None
            ),
            expires_at=expires_at,
            notes=payload.notes,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        orders = [order]
    return orders


async def evaluate_pending_orders(db: Session, user: User) -> int:
    """
    Walk through pending orders and fire any that satisfy their trigger condition
    against the current live price cache. Returns the number of orders updated.
    """
    pending = (
        db.query(PaperOrder)
        .filter(
            PaperOrder.user_id == user.id,
            PaperOrder.status == PaperOrderStatus.pending,
        )
        .all()
    )
    changed = 0
    now = datetime.now(UTC)
    cancelled_pairs: set[str] = set()

    for order in pending:
        if order.expires_at and order.expires_at < now:
            order.status = PaperOrderStatus.expired
            changed += 1
            continue

        live = await get_cached_price(order.asset_symbol)
        if live is None or live.is_stale:
            continue
        price = float(live.price)
        fires = False

        if order.order_type == PaperOrderType.market:
            fires = True
        elif order.order_type == PaperOrderType.limit and order.limit_price is not None:
            lim = float(order.limit_price)
            fires = (order.side == PaperOrderSide.buy and price <= lim) or (
                order.side == PaperOrderSide.sell and price >= lim
            )
        elif order.order_type == PaperOrderType.stop and order.stop_price is not None:
            stp = float(order.stop_price)
            fires = (order.side == PaperOrderSide.buy and price >= stp) or (
                order.side == PaperOrderSide.sell and price <= stp
            )
        elif order.order_type == PaperOrderType.stop_limit and order.stop_price is not None:
            stp = float(order.stop_price)
            fires = (order.side == PaperOrderSide.buy and price >= stp) or (
                order.side == PaperOrderSide.sell and price <= stp
            )

        if fires:
            order.status = PaperOrderStatus.filled
            order.triggered_at = now
            order.filled_at = now
            changed += 1
            if order.oco_pair_id:
                cancelled_pairs.add(order.oco_pair_id)

    # Cancel the partner leg for any OCO that fired
    if cancelled_pairs:
        partners = (
            db.query(PaperOrder)
            .filter(
                PaperOrder.user_id == user.id,
                PaperOrder.oco_pair_id.in_(list(cancelled_pairs)),
                PaperOrder.status == PaperOrderStatus.pending,
            )
            .all()
        )
        for p in partners:
            p.status = PaperOrderStatus.cancelled
            changed += 1

    if changed:
        db.commit()
    return changed


def list_orders(db: Session, user: User) -> PaperOrderList:
    rows = (
        db.query(PaperOrder)
        .filter(PaperOrder.user_id == user.id)
        .order_by(PaperOrder.created_at.desc())
        .all()
    )
    open_list: list[PaperOrderView] = []
    history: list[PaperOrderView] = []
    for order in rows:
        status = order.status.value if hasattr(order.status, "value") else str(order.status)
        view = _view(order)
        if status == "pending":
            open_list.append(view)
        else:
            history.append(view)
    return PaperOrderList(open=open_list, history=history)


def cancel_order(db: Session, user: User, order_id: str) -> PaperOrderView | None:
    order = (
        db.query(PaperOrder)
        .filter(PaperOrder.user_id == user.id, PaperOrder.id == order_id)
        .first()
    )
    if order is None:
        return None
    if order.status != PaperOrderStatus.pending:
        return _view(order)
    order.status = PaperOrderStatus.cancelled
    if order.oco_pair_id:
        partners = (
            db.query(PaperOrder)
            .filter(
                PaperOrder.user_id == user.id,
                PaperOrder.oco_pair_id == order.oco_pair_id,
                PaperOrder.id != order.id,
                PaperOrder.status == PaperOrderStatus.pending,
            )
            .all()
        )
        for p in partners:
            p.status = PaperOrderStatus.cancelled
    db.commit()
    db.refresh(order)
    return _view(order)
