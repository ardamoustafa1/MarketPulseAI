export type Denomination = 'TRY' | 'USD' | 'EUR' | 'BTC' | 'XAU_GRAM';
export type TaxMethod = 'fifo' | 'lifo';
export type StressScenarioId =
  | 'gfc_2008'
  | 'covid_2020'
  | 'fed_hike_2022'
  | 'dot_com_2000'
  | 'try_crisis_2018';

export interface DenominatedPosition {
  symbol: string;
  quantity: number;
  current_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}
export interface DenominationResponse {
  denomination: Denomination;
  rate_used: number;
  total_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  month_to_date_change_pct?: number | null;
  positions: DenominatedPosition[];
}

export interface WeightEntry {
  symbol: string;
  target_pct: number;
  current_pct: number;
  drift_pct: number;
  action: 'buy' | 'sell' | 'hold';
  trade_usd: number;
  trade_quantity: number;
}
export interface RebalancePlan {
  portfolio_id: string;
  drift_tolerance_pct: number;
  total_value_usd: number;
  entries: WeightEntry[];
  narrative: string;
  generated_at: string;
}
export interface RebalanceTargetPayload {
  target_weights: Record<string, number>;
  drift_tolerance_pct?: number;
}

export interface DcaBucketPoint {
  date: string;
  total_invested: number;
  units_held: number;
  market_value: number;
}
export interface DcaSimulationResponse {
  symbol: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  installment_amount: number;
  currency: Denomination;
  start_date: string;
  end_date: string;
  total_invested: number;
  units_held: number;
  final_value: number;
  total_return_pct: number;
  series: DcaBucketPoint[];
  narrative: string;
}

export interface PaperOrderPayload {
  asset_symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'oco';
  quantity: number;
  limit_price?: number | null;
  stop_price?: number | null;
  take_profit_price?: number | null;
  expires_in_hours?: number | null;
  notes?: string | null;
}
export interface PaperOrderView {
  id: string;
  asset_symbol: string;
  side: string;
  order_type: string;
  status: string;
  quantity: number;
  limit_price?: number | null;
  stop_price?: number | null;
  take_profit_price?: number | null;
  triggered_at?: string | null;
  filled_at?: string | null;
  expires_at?: string | null;
  oco_pair_id?: string | null;
  created_at: string;
  notes?: string | null;
}
export interface PaperOrderList {
  open: PaperOrderView[];
  history: PaperOrderView[];
}

export interface TaxLot {
  symbol: string;
  acquired_at: string;
  quantity: number;
  cost_per_unit: number;
  cost_basis: number;
  current_price?: number | null;
  unrealized_pnl?: number | null;
  unrealized_pnl_pct?: number | null;
  age_days: number;
}
export interface RealizedEvent {
  symbol: string;
  sold_at: string;
  quantity: number;
  proceeds: number;
  cost_basis: number;
  realized_pnl: number;
}
export interface TaxLotReport {
  method: TaxMethod;
  open_lots: TaxLot[];
  realized_events: RealizedEvent[];
  total_open_cost: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  generated_at: string;
}

export interface GoalTargetItem {
  symbol: string;
  quantity: number;
}
export interface GoalProgressItem {
  symbol: string;
  target_quantity: number;
  current_quantity: number;
  progress_pct: number;
  gap_value_usd: number;
}
export interface MultiAssetGoalPayload {
  title: string;
  due_date?: string | null;
  risk_mode?: 'conservative' | 'balanced' | 'aggressive';
  monthly_contribution?: number | null;
  contribution_currency?: Denomination;
  target_composition: GoalTargetItem[];
}
export interface MultiAssetGoalView {
  id: string;
  title: string;
  due_date?: string | null;
  risk_mode: string;
  monthly_contribution?: number | null;
  contribution_currency: string;
  target_composition: GoalTargetItem[];
  progress: GoalProgressItem[];
  on_track: boolean;
  required_monthly_usd: number;
  tempo_label: 'ahead' | 'on_pace' | 'behind';
  created_at: string;
}

export interface SharedMemberPayload {
  invitee_email: string;
  role?: 'editor' | 'viewer';
  message?: string | null;
}
export interface SharedMemberView {
  id: string;
  portfolio_id: string;
  invitee_email: string;
  role: string;
  accepted: boolean;
  invite_token: string;
  created_at: string;
  accepted_at?: string | null;
}

export interface StressImpact {
  symbol: string;
  weight_pct: number;
  shock_pct: number;
  value_change_usd: number;
}
export interface StressResult {
  scenario_id: StressScenarioId;
  scenario_label: string;
  narrative: string;
  portfolio_value_usd_before: number;
  portfolio_value_usd_after: number;
  portfolio_change_pct: number;
  max_drawdown_pct: number;
  worst_impact?: StressImpact | null;
  best_impact?: StressImpact | null;
}
export interface StressTestResponse {
  portfolio_id: string;
  generated_at: string;
  results: StressResult[];
}
