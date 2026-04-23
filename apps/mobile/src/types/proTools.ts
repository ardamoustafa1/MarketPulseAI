export type Timeframe = '15m' | '1h' | '4h' | '1d' | '1w';

export type FormulaMetric =
  | 'price'
  | 'ratio'
  | 'percent_change_24h'
  | 'rsi_14'
  | 'macd_hist'
  | 'volatility_30d';

export type FormulaOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'cross_above'
  | 'cross_below'
  | 'change_pct_gte'
  | 'change_pct_lte';

export type ExchangeCode =
  | 'binance'
  | 'btcturk'
  | 'paribu'
  | 'binance_tr'
  | 'garanti_fx'
  | 'kapalicarsi';

export type StrategyRuleKind =
  | 'dca_on_drawdown'
  | 'dca_on_breakout'
  | 'rebalance_drift'
  | 'momentum_ladder';

// Technical Analysis ---------------------------------------------------------
export interface TAIndicator {
  name: string;
  label: string;
  value: number;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
  caption?: string | null;
}

export interface FibonacciLevel {
  label: string;
  value: number;
  distance_pct: number;
}

export interface TechnicalAnalysisView {
  symbol: string;
  timeframe: Timeframe;
  last_price: number;
  summary_tone: 'bullish' | 'bearish' | 'neutral';
  ai_takeaway: string;
  indicators: TAIndicator[];
  bollinger: { middle: number; upper: number; lower: number; bandwidth_pct: number };
  macd: { line: number; signal: number; histogram: number };
  rsi_14: number;
  fibonacci: FibonacciLevel[];
  support_levels: number[];
  resistance_levels: number[];
  generated_at: string;
}

// Formula Alerts -------------------------------------------------------------
export interface FormulaCondition {
  symbol: string;
  metric: FormulaMetric;
  operator: FormulaOperator;
  target: number;
  reference_symbol?: string | null;
  window_hours?: number | null;
}

export interface FormulaAlertPayload {
  name: string;
  description?: string | null;
  conditions: FormulaCondition[];
  logical_operator: 'and' | 'or';
  notify_push: boolean;
  notify_email: boolean;
}

export interface FormulaAlertView {
  id: string;
  name: string;
  description: string | null;
  conditions: FormulaCondition[];
  logical_operator: 'and' | 'or';
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  notify_push: boolean;
  notify_email: boolean;
  created_at: string;
}

export interface FormulaEvaluationResult {
  alert_id: string;
  triggered: boolean;
  condition_results: Array<{
    symbol: string;
    metric: FormulaMetric;
    operator: FormulaOperator;
    target: number;
    value: number | null;
    scope: string;
    matched: boolean;
  }>;
  evaluated_at: string;
}

// Spread ---------------------------------------------------------------------
export interface ExchangeQuote {
  exchange: ExchangeCode;
  bid: number;
  ask: number;
  mid: number;
  last_updated_at: string;
}

export interface SpreadOpportunity {
  symbol: string;
  buy_exchange: ExchangeCode;
  sell_exchange: ExchangeCode;
  buy_price: number;
  sell_price: number;
  spread_abs: number;
  spread_pct: number;
  tone: 'positive' | 'neutral' | 'warning';
}

export interface SpreadView {
  symbol: string;
  quotes: ExchangeQuote[];
  opportunities: SpreadOpportunity[];
  best_spread_pct: number;
  generated_at: string;
}

// Volatility Cone ------------------------------------------------------------
export interface VolatilityBand {
  percentile: number;
  annualized_vol_pct: number;
}

export interface VolatilityConeView {
  symbol: string;
  window_days: number;
  realized_vol_pct: number;
  implied_vol_pct: number | null;
  bands: VolatilityBand[];
  regime: 'calm' | 'normal' | 'elevated' | 'extreme';
  narrative: string;
  generated_at: string;
}

// Position Slicing -----------------------------------------------------------
export interface SlicingSlice {
  index: number;
  scheduled_at: string;
  allocation: number;
  projected_price: number;
  cumulative_units: number;
}

export interface SlicingPlanView {
  symbol: string;
  total_budget: number;
  currency: string;
  slice_count: number;
  cadence_days: number;
  start_date: string;
  end_date: string;
  slices: SlicingSlice[];
  expected_avg_price: number;
  expected_units: number;
  expected_cost: number;
  narrative: string;
}

// Tax Export -----------------------------------------------------------------
export interface TaxExportRow {
  symbol: string;
  acquired_on: string | null;
  disposed_on: string | null;
  quantity: number;
  cost_basis: number;
  proceeds: number | null;
  realized_pnl: number | null;
  lot_age_days: number | null;
  method: 'fifo' | 'lifo';
}

export interface TaxExportPayload {
  method?: 'fifo' | 'lifo';
  tax_year?: number | null;
  include_unrealized?: boolean;
}

export interface TaxExportView {
  method: 'fifo' | 'lifo';
  tax_year: number | null;
  rows: TaxExportRow[];
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  disclosure: string;
  csv_body: string;
  generated_at: string;
}

// Strategy Playground --------------------------------------------------------
export interface StrategyRulePayload {
  kind: StrategyRuleKind;
  symbol: string;
  installment_amount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  drawdown_trigger_pct?: number | null;
  breakout_trigger_pct?: number | null;
  drift_tolerance_pct?: number | null;
  ladder_steps?: number | null;
  lookback_days: number;
}

export interface BacktestPoint {
  date: string;
  invested: number;
  units_held: number;
  market_value: number;
}

export interface StrategyBacktestView {
  id: string;
  rule: StrategyRulePayload;
  total_invested: number;
  final_value: number;
  units_held: number;
  total_return_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  series: BacktestPoint[];
  narrative: string;
  generated_at: string;
}

export interface StrategyListView {
  rules: StrategyRulePayload[];
  last_run_at: string | null;
}
