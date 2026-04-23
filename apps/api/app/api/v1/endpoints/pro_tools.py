"""
API endpoints for the "Pro Tools" layer.

Mounted under /api/v1/pro-tools. These routes power the power-user surfaces in
the mobile app: technical-analysis panel, formula alerts, spread detector,
volatility cone, position-slicing calculator, tax export and strategy
playground.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.pro_tools import FormulaAlert
from app.models.user import User
from app.schemas.pro_tools import (
    FormulaAlertPayload,
    FormulaAlertView,
    FormulaEvaluationResult,
    SlicingPlanView,
    SpreadView,
    StrategyBacktestView,
    StrategyListView,
    StrategyRulePayload,
    TaxExportPayload,
    TaxExportView,
    TechnicalAnalysisView,
    Timeframe,
    VolatilityConeView,
)
from app.services.pro_tools.formula_alerts import (
    create_alert,
    delete_alert,
    evaluate_alert,
    evaluate_all,
    list_alerts,
    toggle_alert,
)
from app.services.pro_tools.position_slicing import build_position_slicing
from app.services.pro_tools.spread_detector import build_spread_view
from app.services.pro_tools.strategy_playground import (
    delete_rule,
    list_rules,
    run_playground,
)
from app.services.pro_tools.tax_export import build_tax_export
from app.services.pro_tools.technical_analysis import build_technical_analysis
from app.services.pro_tools.volatility_cone import build_volatility_cone

router = APIRouter()


# ─────────── Technical Analysis ───────────


@router.get("/technical-analysis/{symbol}", response_model=TechnicalAnalysisView)
async def technical_analysis(
    symbol: str,
    timeframe: Timeframe = Query(default="1d"),
) -> TechnicalAnalysisView:
    return await build_technical_analysis(symbol, timeframe)


# ─────────── Formula Alerts ───────────


@router.get("/formula-alerts", response_model=list[FormulaAlertView])
async def list_formula_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FormulaAlertView]:
    return list_alerts(db, user)


@router.post("/formula-alerts", response_model=FormulaAlertView)
async def create_formula_alert(
    payload: FormulaAlertPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FormulaAlertView:
    try:
        return create_alert(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/formula-alerts/{alert_id}/toggle", response_model=FormulaAlertView)
async def toggle_formula_alert(
    alert_id: str,
    active: bool = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FormulaAlertView:
    view = toggle_alert(db, user, alert_id, active)
    if view is None:
        raise HTTPException(status_code=404, detail="Uyarı bulunamadı.")
    return view


@router.delete("/formula-alerts/{alert_id}")
async def delete_formula_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ok = delete_alert(db, user, alert_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Uyarı bulunamadı.")
    return {"deleted": True}


@router.post("/formula-alerts/{alert_id}/evaluate", response_model=FormulaEvaluationResult)
async def evaluate_formula_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FormulaEvaluationResult:
    from uuid import UUID

    try:
        uid = UUID(alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Geçersiz ID.") from exc
    row = (
        db.query(FormulaAlert)
        .filter(FormulaAlert.user_id == user.id, FormulaAlert.id == uid)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Uyarı bulunamadı.")
    return await evaluate_alert(db, row)


@router.post("/formula-alerts/evaluate-all", response_model=list[FormulaEvaluationResult])
async def evaluate_all_formula_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FormulaEvaluationResult]:
    return await evaluate_all(db, user)


# ─────────── Spread Detector ───────────


@router.get("/spread/{symbol}", response_model=SpreadView)
async def spread_view(symbol: str) -> SpreadView:
    return await build_spread_view(symbol)


# ─────────── Volatility Cone ───────────


@router.get("/volatility-cone/{symbol}", response_model=VolatilityConeView)
async def volatility_cone(
    symbol: str,
    window: int = Query(default=30, ge=7, le=180),
) -> VolatilityConeView:
    return await build_volatility_cone(symbol, window_days=window)


# ─────────── Position Slicing ───────────


@router.get("/position-slicing", response_model=SlicingPlanView)
async def position_slicing(
    symbol: str = Query(...),
    total_budget: float = Query(..., gt=0),
    currency: str = Query(default="TRY"),
    slice_count: int = Query(default=4, ge=2, le=24),
    cadence_days: int = Query(default=7, ge=1, le=90),
) -> SlicingPlanView:
    if currency not in ("TRY", "USD", "EUR"):
        raise HTTPException(status_code=400, detail="currency TRY/USD/EUR olmalı.")
    return await build_position_slicing(
        symbol=symbol,
        total_budget=total_budget,
        currency=currency,  # type: ignore[arg-type]
        slice_count=slice_count,
        cadence_days=cadence_days,
    )


# ─────────── Tax Export ───────────


@router.post("/tax-export", response_model=TaxExportView)
async def tax_export(
    payload: TaxExportPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaxExportView:
    return await build_tax_export(db, user, payload)


# ─────────── Strategy Playground ───────────


@router.post("/strategy-playground", response_model=StrategyBacktestView)
async def strategy_playground(
    payload: StrategyRulePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StrategyBacktestView:
    return await run_playground(db, user, payload)


@router.get("/strategy-playground", response_model=StrategyListView)
async def strategy_playground_list(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StrategyListView:
    return list_rules(db, user)


@router.delete("/strategy-playground/{rule_id}")
async def strategy_playground_delete(
    rule_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ok = delete_rule(db, user, rule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Strateji bulunamadı.")
    return {"deleted": True}
