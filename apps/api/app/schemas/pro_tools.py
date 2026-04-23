"""
Pydantic schemas for the "Pro Tools" feature pack:

  * Technical Analysis Panel (RSI / MACD / BB / Fib + AI takeaway)
  * Alerts 2.0 — formula-based compound alerts
  * Cross-Exchange Spread Detector (BtcTurk, Paribu, Binance…)
  * Volatility Cone (realized vs historical distribution)
  * Position Slicing Calculator
  * Tax Report Export (CSV + structured PDF payload)
  * Strategy Playground (rule-based backtest)
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Timeframe = Literal["15m", "1h", "4h", "1d", "1w"]
FormulaOperator = Literal[
    "gt", "gte", "lt", "lte", "cross_above", "cross_below", "change_pct_gte", "change_pct_lte"
]
FormulaMetric = Literal[
    "price", "ratio", "percent_change_24h", "rsi_14", "macd_hist", "volatility_30d"
]
ExchangeCode = Literal[
    "binance", "btcturk", "paribu", "binance_tr", "garanti_fx", "kapalicarsi"
]
StrategyRuleKind = Literal[
    "dca_on_drawdown", "dca_on_breakout", "rebalance_drift", "momentum_ladder"
]


# ─────────────────────── Technical Analysis ───────────────────────


class TAIndicator(BaseModel):
    name: str
    label: str
    value: float
    tone: Literal["positive", "negative", "neutral", "warning"] = "neutral"
    caption: str | None = None


class FibonacciLevel(BaseModel):
    label: str
    value: float
    distance_pct: float


class TechnicalAnalysisView(BaseModel):
    symbol: str
    timeframe: Timeframe
    last_price: float
    summary_tone: Literal["bullish", "bearish", "neutral"]
    ai_takeaway: str
    indicators: list[TAIndicator]
    bollinger: dict[str, float]
    macd: dict[str, float]
    rsi_14: float
    fibonacci: list[FibonacciLevel]
    support_levels: list[float]
    resistance_levels: list[float]
    generated_at: datetime


# ─────────────────────── Formula Alerts ───────────────────────


class FormulaCondition(BaseModel):
    symbol: str
    metric: FormulaMetric
    operator: FormulaOperator
    target: float
    reference_symbol: str | None = Field(
        default=None,
        description="Second symbol used for ratio / cross metrics.",
    )
    window_hours: int | None = Field(default=None, description="Lookback for percent change.")


class FormulaAlertPayload(BaseModel):
    name: str
    description: str | None = None
    conditions: list[FormulaCondition]
    logical_operator: Literal["and", "or"] = "and"
    notify_push: bool = True
    notify_email: bool = False


class FormulaAlertView(BaseModel):
    id: str
    name: str
    description: str | None
    conditions: list[FormulaCondition]
    logical_operator: Literal["and", "or"]
    is_active: bool
    last_triggered_at: datetime | None
    trigger_count: int
    notify_push: bool
    notify_email: bool
    created_at: datetime


class FormulaEvaluationResult(BaseModel):
    alert_id: str
    triggered: bool
    condition_results: list[dict]
    evaluated_at: datetime


# ─────────────────────── Spread Detector ───────────────────────


class ExchangeQuote(BaseModel):
    exchange: ExchangeCode
    bid: float
    ask: float
    mid: float
    last_updated_at: datetime


class SpreadOpportunity(BaseModel):
    symbol: str
    buy_exchange: ExchangeCode
    sell_exchange: ExchangeCode
    buy_price: float
    sell_price: float
    spread_abs: float
    spread_pct: float
    tone: Literal["positive", "neutral", "warning"]


class SpreadView(BaseModel):
    symbol: str
    quotes: list[ExchangeQuote]
    opportunities: list[SpreadOpportunity]
    best_spread_pct: float
    generated_at: datetime


# ─────────────────────── Volatility Cone ───────────────────────


class VolatilityBand(BaseModel):
    percentile: int
    annualized_vol_pct: float


class VolatilityConeView(BaseModel):
    symbol: str
    window_days: int
    realized_vol_pct: float
    implied_vol_pct: float | None
    bands: list[VolatilityBand]
    regime: Literal["calm", "normal", "elevated", "extreme"]
    narrative: str
    generated_at: datetime


# ─────────────────────── Position Slicing ───────────────────────


class SlicingSlice(BaseModel):
    index: int
    scheduled_at: str
    allocation: float
    projected_price: float
    cumulative_units: float


class SlicingPlanView(BaseModel):
    symbol: str
    total_budget: float
    currency: str
    slice_count: int
    cadence_days: int
    start_date: str
    end_date: str
    slices: list[SlicingSlice]
    expected_avg_price: float
    expected_units: float
    expected_cost: float
    narrative: str


# ─────────────────────── Tax Export ───────────────────────


class TaxExportRow(BaseModel):
    symbol: str
    acquired_on: str | None
    disposed_on: str | None
    quantity: float
    cost_basis: float
    proceeds: float | None
    realized_pnl: float | None
    lot_age_days: int | None
    method: Literal["fifo", "lifo"]


class TaxExportPayload(BaseModel):
    method: Literal["fifo", "lifo"] = "fifo"
    tax_year: int | None = None
    include_unrealized: bool = False


class TaxExportView(BaseModel):
    method: Literal["fifo", "lifo"]
    tax_year: int | None
    rows: list[TaxExportRow]
    total_realized_pnl: float
    total_unrealized_pnl: float
    disclosure: str
    csv_body: str
    generated_at: datetime


# ─────────────────────── Strategy Playground ───────────────────────


class StrategyRulePayload(BaseModel):
    kind: StrategyRuleKind
    symbol: str
    installment_amount: float = Field(gt=0)
    currency: Literal["TRY", "USD", "EUR"] = "TRY"
    drawdown_trigger_pct: float | None = Field(default=-5.0)
    breakout_trigger_pct: float | None = Field(default=3.0)
    drift_tolerance_pct: float | None = Field(default=5.0)
    ladder_steps: int | None = Field(default=4)
    lookback_days: int = Field(default=730, ge=30, le=1460)


class BacktestPoint(BaseModel):
    date: str
    invested: float
    units_held: float
    market_value: float


class StrategyBacktestView(BaseModel):
    id: str
    rule: StrategyRulePayload
    total_invested: float
    final_value: float
    units_held: float
    total_return_pct: float
    cagr_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    series: list[BacktestPoint]
    narrative: str
    generated_at: datetime


class StrategyListView(BaseModel):
    rules: list[StrategyRulePayload]
    last_run_at: datetime | None
