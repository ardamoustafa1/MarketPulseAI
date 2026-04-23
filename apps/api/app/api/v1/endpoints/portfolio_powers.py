"""
API endpoints for the "Portfolio Super Powers" feature set.

Routes (mounted under /api/v1/portfolio-powers):
  * GET    /denomination?denomination=TRY|USD|EUR|BTC|XAU_GRAM
  * GET    /rebalance              → current plan
  * PUT    /rebalance              → set target weights
  * POST   /dca                    → simulate DCA
  * POST   /paper-orders           → submit paper order (market/limit/stop/oco)
  * GET    /paper-orders           → open + history
  * POST   /paper-orders/evaluate  → evaluate pending against live cache
  * DELETE /paper-orders/{id}      → cancel
  * GET    /tax-lots?method=fifo|lifo
  * POST   /goals                  → create multi-asset goal
  * GET    /goals                  → list goals with progress
  * DELETE /goals/{id}             → archive goal
  * POST   /shared                 → invite member
  * GET    /shared                 → list members on default portfolio
  * POST   /shared/accept/{token}  → accept invite
  * DELETE /shared/{id}            → revoke member
  * POST   /stress-test            → run scenarios
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.portfolio_powers import PortfolioGoal
from app.models.user import User
from app.schemas.portfolio_powers import (
    DcaSimulationResponse,
    Denomination,
    DenominationResponse,
    MultiAssetGoalPayload,
    MultiAssetGoalView,
    PaperOrderList,
    PaperOrderPayload,
    PaperOrderView,
    RebalancePlan,
    RebalanceTargetPayload,
    SharedMemberPayload,
    SharedMemberView,
    StressScenarioId,
    StressTestResponse,
    TaxLotReport,
    TaxMethod,
)
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio_powers.dca_simulator import run_dca_simulation
from app.services.portfolio_powers.denomination import build_denomination_snapshot
from app.services.portfolio_powers.goals_multi import build_goal_view, create_goal
from app.services.portfolio_powers.paper_orders import (
    cancel_order,
    evaluate_pending_orders,
    list_orders,
    submit_order,
)
from app.services.portfolio_powers.rebalancer import build_rebalance_plan, upsert_target
from app.services.portfolio_powers.shared_portfolio import (
    accept_invite,
    invite_member,
    list_members,
    revoke_member,
)
from app.services.portfolio_powers.stress_test import build_stress_test
from app.services.portfolio_powers.tax_lots import build_tax_report

router = APIRouter()


# ─────────── Denomination ───────────


@router.get("/denomination", response_model=DenominationResponse)
async def denomination(
    denomination: Denomination = Query(default="TRY"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DenominationResponse:
    return await build_denomination_snapshot(db, user, denomination)


# ─────────── Rebalancer ───────────


@router.get("/rebalance", response_model=RebalancePlan)
async def rebalance_plan(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RebalancePlan:
    return await build_rebalance_plan(db, user)


@router.put("/rebalance", response_model=RebalancePlan)
async def set_rebalance_target(
    payload: RebalanceTargetPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RebalancePlan:
    portfolio = get_or_create_default_portfolio(db, user.id)
    try:
        upsert_target(db, user, portfolio, payload.target_weights, payload.drift_tolerance_pct)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await build_rebalance_plan(db, user)


# ─────────── DCA Simulator ───────────


@router.post("/dca", response_model=DcaSimulationResponse)
async def dca_simulate(
    symbol: str = Query(...),
    installment_amount: float = Query(..., gt=0),
    currency: Denomination = Query(default="TRY"),
    cadence: str = Query(default="monthly"),
    start_date: str | None = Query(default=None),
) -> DcaSimulationResponse:
    start_dt: datetime | None = None
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=UTC)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="start_date ISO-8601 olmalı.") from exc
    if cadence not in ("weekly", "biweekly", "monthly"):
        raise HTTPException(status_code=400, detail="cadence weekly/biweekly/monthly olmalı.")
    return await run_dca_simulation(
        symbol=symbol,
        installment_amount=installment_amount,
        currency=currency,
        cadence=cadence,
        start_date=start_dt,
    )


# ─────────── Paper Orders ───────────


@router.post("/paper-orders", response_model=list[PaperOrderView])
async def create_paper_order(
    payload: PaperOrderPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PaperOrderView]:
    try:
        orders = submit_order(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return [
        PaperOrderView(
            id=str(o.id),
            asset_symbol=o.asset_symbol,
            side=o.side.value,
            order_type=o.order_type.value,
            status=o.status.value,
            quantity=float(o.quantity),
            limit_price=float(o.limit_price) if o.limit_price is not None else None,
            stop_price=float(o.stop_price) if o.stop_price is not None else None,
            take_profit_price=float(o.take_profit_price)
            if o.take_profit_price is not None
            else None,
            triggered_at=o.triggered_at,
            filled_at=o.filled_at,
            expires_at=o.expires_at,
            oco_pair_id=o.oco_pair_id,
            created_at=o.created_at,
            notes=o.notes,
        )
        for o in orders
    ]


@router.get("/paper-orders", response_model=PaperOrderList)
async def paper_orders_list(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaperOrderList:
    return list_orders(db, user)


@router.post("/paper-orders/evaluate")
async def paper_orders_evaluate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    changed = await evaluate_pending_orders(db, user)
    return {"orders_updated": changed}


@router.delete("/paper-orders/{order_id}", response_model=PaperOrderView)
async def paper_orders_cancel(
    order_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaperOrderView:
    view = cancel_order(db, user, order_id)
    if view is None:
        raise HTTPException(status_code=404, detail="Emir bulunamadı.")
    return view


# ─────────── Tax Lots ───────────


@router.get("/tax-lots", response_model=TaxLotReport)
async def tax_lots(
    method: TaxMethod = Query(default="fifo"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaxLotReport:
    return await build_tax_report(db, user, method=method)


# ─────────── Multi-Asset Goals ───────────


@router.post("/goals", response_model=MultiAssetGoalView)
async def goals_create(
    payload: MultiAssetGoalPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MultiAssetGoalView:
    goal = create_goal(db, user, payload)
    return await build_goal_view(db, user, goal)


@router.get("/goals", response_model=list[MultiAssetGoalView])
async def goals_list(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MultiAssetGoalView]:
    rows = (
        db.query(PortfolioGoal)
        .filter(PortfolioGoal.user_id == user.id, PortfolioGoal.archived_at.is_(None))
        .order_by(PortfolioGoal.created_at.desc())
        .all()
    )
    return [await build_goal_view(db, user, r) for r in rows]


@router.delete("/goals/{goal_id}")
async def goals_archive(
    goal_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = (
        db.query(PortfolioGoal)
        .filter(PortfolioGoal.user_id == user.id, PortfolioGoal.id == goal_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı.")
    row.archived_at = datetime.now(UTC)
    db.commit()
    return {"archived": True}


# ─────────── Shared Portfolio ───────────


@router.post("/shared", response_model=SharedMemberView)
async def shared_invite(
    payload: SharedMemberPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SharedMemberView:
    portfolio = get_or_create_default_portfolio(db, user.id)
    return invite_member(db, portfolio, user, payload)


@router.get("/shared", response_model=list[SharedMemberView])
async def shared_list(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SharedMemberView]:
    portfolio = get_or_create_default_portfolio(db, user.id)
    return list_members(db, portfolio)


@router.post("/shared/accept/{token}", response_model=SharedMemberView)
async def shared_accept(
    token: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SharedMemberView:
    view = accept_invite(db, user, token)
    if view is None:
        raise HTTPException(status_code=404, detail="Davet bulunamadı.")
    return view


@router.delete("/shared/{member_id}")
async def shared_revoke(
    member_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    portfolio = get_or_create_default_portfolio(db, user.id)
    ok = revoke_member(db, portfolio, member_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Üye bulunamadı.")
    return {"revoked": True}


# ─────────── Stress Test ───────────


@router.post("/stress-test", response_model=StressTestResponse)
async def stress_test(
    scenarios: list[StressScenarioId] | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StressTestResponse:
    return await build_stress_test(db, user, scenarios=scenarios)
