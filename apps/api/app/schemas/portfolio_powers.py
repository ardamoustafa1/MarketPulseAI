"""Schemas for Portfolio Super Powers: denomination, rebalance, DCA,
paper orders, tax lots (FIFO/LIFO), multi-asset goals, shared portfolios,
stress tests."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Denomination = Literal["TRY", "USD", "EUR", "BTC", "XAU_GRAM"]


# ────────── Denomination ──────────


class DenominatedPosition(BaseModel):
    symbol: str
    quantity: float
    current_value: float
    cost_basis: float
    unrealized_pnl: float
    unrealized_pnl_pct: float


class DenominationResponse(BaseModel):
    denomination: Denomination
    rate_used: float = Field(..., description="How many units of the denomination per 1 USD")
    total_value: float
    cost_basis: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    month_to_date_change_pct: float | None = None
    positions: list[DenominatedPosition] = Field(default_factory=list)


# ────────── Rebalancer ──────────


class WeightEntry(BaseModel):
    symbol: str
    target_pct: float
    current_pct: float
    drift_pct: float
    action: Literal["buy", "sell", "hold"]
    trade_usd: float = 0.0
    trade_quantity: float = 0.0


class RebalancePlan(BaseModel):
    portfolio_id: str
    drift_tolerance_pct: float
    total_value_usd: float
    entries: list[WeightEntry]
    narrative: str
    generated_at: datetime


class RebalanceTargetPayload(BaseModel):
    target_weights: dict[str, float] = Field(..., description="{'BTC': 30, 'GRAMALTIN': 40}")
    drift_tolerance_pct: float = 5


# ────────── DCA Simulator ──────────


class DcaBucketPoint(BaseModel):
    date: str
    total_invested: float
    units_held: float
    market_value: float


class DcaSimulationResponse(BaseModel):
    symbol: str
    cadence: Literal["weekly", "biweekly", "monthly"]
    installment_amount: float
    currency: Denomination
    start_date: str
    end_date: str
    total_invested: float
    units_held: float
    final_value: float
    total_return_pct: float
    series: list[DcaBucketPoint]
    narrative: str


# ────────── Paper Orders (stop / limit / OCO) ──────────


class PaperOrderPayload(BaseModel):
    asset_symbol: str
    side: Literal["buy", "sell"]
    order_type: Literal["market", "limit", "stop", "stop_limit", "oco"]
    quantity: float
    limit_price: float | None = None
    stop_price: float | None = None
    take_profit_price: float | None = None
    expires_in_hours: int | None = None
    notes: str | None = None


class PaperOrderView(BaseModel):
    id: str
    asset_symbol: str
    side: str
    order_type: str
    status: str
    quantity: float
    limit_price: float | None = None
    stop_price: float | None = None
    take_profit_price: float | None = None
    triggered_at: datetime | None = None
    filled_at: datetime | None = None
    expires_at: datetime | None = None
    oco_pair_id: str | None = None
    created_at: datetime
    notes: str | None = None


class PaperOrderList(BaseModel):
    open: list[PaperOrderView] = Field(default_factory=list)
    history: list[PaperOrderView] = Field(default_factory=list)


# ────────── Tax Lots (FIFO / LIFO) ──────────


TaxMethod = Literal["fifo", "lifo"]


class TaxLot(BaseModel):
    symbol: str
    acquired_at: str
    quantity: float
    cost_per_unit: float
    cost_basis: float
    current_price: float | None = None
    unrealized_pnl: float | None = None
    unrealized_pnl_pct: float | None = None
    age_days: int


class RealizedEvent(BaseModel):
    symbol: str
    sold_at: str
    quantity: float
    proceeds: float
    cost_basis: float
    realized_pnl: float


class TaxLotReport(BaseModel):
    method: TaxMethod
    open_lots: list[TaxLot] = Field(default_factory=list)
    realized_events: list[RealizedEvent] = Field(default_factory=list)
    total_open_cost: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    generated_at: datetime


# ────────── Multi-Asset Goals ──────────


class GoalTargetItem(BaseModel):
    symbol: str
    quantity: float


class GoalProgressItem(BaseModel):
    symbol: str
    target_quantity: float
    current_quantity: float
    progress_pct: float
    gap_value_usd: float


class MultiAssetGoalPayload(BaseModel):
    title: str
    due_date: str | None = None
    risk_mode: Literal["conservative", "balanced", "aggressive"] = "balanced"
    monthly_contribution: float | None = None
    contribution_currency: Denomination = "TRY"
    target_composition: list[GoalTargetItem]


class MultiAssetGoalView(BaseModel):
    id: str
    title: str
    due_date: str | None = None
    risk_mode: str
    monthly_contribution: float | None = None
    contribution_currency: str
    target_composition: list[GoalTargetItem]
    progress: list[GoalProgressItem]
    on_track: bool
    required_monthly_usd: float
    tempo_label: Literal["ahead", "on_pace", "behind"]
    created_at: datetime


# ────────── Shared Portfolio ──────────


class SharedMemberPayload(BaseModel):
    invitee_email: str
    role: Literal["editor", "viewer"] = "viewer"
    message: str | None = None


class SharedMemberView(BaseModel):
    id: str
    portfolio_id: str
    invitee_email: str
    role: str
    accepted: bool
    invite_token: str
    message: str | None = None
    created_at: datetime


# ────────── Stress Test ──────────


StressScenarioId = Literal[
    "gfc_2008",
    "covid_2020",
    "fed_hike_2022",
    "dot_com_2000",
    "try_crisis_2018",
]


class StressImpact(BaseModel):
    symbol: str
    weight_pct: float
    shock_pct: float
    usd_impact: float


class StressResult(BaseModel):
    scenario_id: StressScenarioId
    scenario_label: str
    narrative: str
    portfolio_value_usd_before: float
    portfolio_value_usd_after: float
    portfolio_change_pct: float
    max_drawdown_pct: float
    worst_impact: StressImpact | None
    best_impact: StressImpact | None
    impacts: list[StressImpact]


class StressTestResponse(BaseModel):
    generated_at: datetime
    results: list[StressResult]
