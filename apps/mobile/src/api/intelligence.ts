import { apiClient } from './client';

// ───────────────────────────────────────────────────────────────────────
// Types mirror apps/api/app/schemas/intelligence.py. Kept deliberately thin
// so upstream schema updates surface as TS errors.
// ───────────────────────────────────────────────────────────────────────

export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'REDUCE_RISK' | 'ADD_RISK' | 'PROTECT';
export type RegimeType = 'risk_on' | 'risk_off' | 'neutral' | 'rotation';
export type Severity = 'positive' | 'negative' | 'neutral' | 'warning';
export type RatioDirection = 'extreme_low' | 'low' | 'normal' | 'high' | 'extreme_high';

export interface AssetSignal {
  symbol: string;
  asset_type: string;
  action: SignalAction;
  confidence: number;
  rationale: string;
  score: number;
  momentum_pct: number;
  volatility_z: number;
  last_price: number | null;
  change_24h_pct: number | null;
  historical_hit_rate: number | null;
}

export interface PortfolioSignal {
  action: SignalAction;
  confidence: number;
  headline: string;
  rationale: string;
  net_bullish: number;
  net_bearish: number;
  dominant_asset_type: string | null;
  portfolio_volatility: number | null;
}

export interface TodaySignalSection {
  generated_at: string;
  portfolio: PortfolioSignal | null;
  assets: AssetSignal[];
}

export interface RegimeComponent {
  label: string;
  value: number;
  contribution: number;
}

export interface RegimeSection {
  regime: RegimeType;
  score: number;
  confidence: number;
  headline: string;
  narrative: string;
  winners: string[];
  losers: string[];
  components: RegimeComponent[];
}

export interface RatioSignal {
  key: string;
  label: string;
  value: number;
  z_score: number;
  percentile: number;
  direction: RatioDirection;
  historical_reaction: string | null;
  unit: string | null;
}

export interface RatiosSection {
  generated_at: string;
  entries: RatioSignal[];
}

export interface CorrelationCell {
  row: string;
  col: string;
  value: number;
}

export interface CorrelationHighlight {
  pair: [string, string];
  value: number;
  delta_vs_90d_prior: number;
  message: string;
}

export interface CorrelationSection {
  window_days: number;
  symbols: string[];
  matrix: number[][];
  cells: CorrelationCell[];
  highlights: CorrelationHighlight[];
}

export interface NewsAssetImpact {
  symbol: string;
  expected_move_pct: number;
  monetary_impact: number;
  direction: 'up' | 'down' | 'flat';
}

export interface NewsImpactItem {
  id: string;
  title: string;
  source: string;
  link: string | null;
  published_at: string | null;
  severity: Severity;
  portfolio_impact: number;
  impact_currency: 'TRY' | 'USD';
  tags: string[];
  assets: NewsAssetImpact[];
  summary: string | null;
}

export interface NewsImpactSection {
  generated_at: string;
  items: NewsImpactItem[];
}

export interface HistoricalReactionSample {
  symbol: string;
  mean_pct: number;
  win_rate: number;
  sample_size: number;
}

export interface MacroEvent {
  id: string;
  title: string;
  country: string;
  category: 'central_bank' | 'macro_print' | 'commodity' | 'earnings' | 'geopolitics';
  scheduled_at: string;
  importance: 'low' | 'medium' | 'high';
  summary: string;
  expected_impact: HistoricalReactionSample[];
}

export interface MacroCalendarSection {
  window_days: number;
  events: MacroEvent[];
}

export interface OnchainMetric {
  key: string;
  label: string;
  value: number;
  unit: string | null;
  trend_pct_24h: number | null;
  description: string | null;
}

export interface OnchainAssetPulse {
  symbol: string;
  net_bias: 'accumulation' | 'distribution' | 'neutral';
  fear_greed_index: number | null;
  halving_days: number | null;
  summary: string;
  metrics: OnchainMetric[];
}

export interface OnchainSection {
  generated_at: string;
  assets: OnchainAssetPulse[];
}

export interface BazaarInstrument {
  symbol: string;
  label: string;
  bazaar_price: number;
  fair_value: number;
  premium_pct: number;
  verdict: 'rich' | 'fair' | 'cheap';
}

export interface BazaarSpreadSection {
  lbma_reference_usd: number;
  usdtry: number;
  gram_fair_try: number;
  reasonable_bid_ask_pct: number;
  narrative: string;
  instruments: BazaarInstrument[];
}

export interface CarryPair {
  pair: string;
  base_rate: number;
  quote_rate: number;
  carry_pct: number;
  momentum_pct: number;
  score: number;
  verdict: 'attractive' | 'neutral' | 'avoid';
  rationale: string;
}

export interface FxCarrySection {
  generated_at: string;
  reference_currency: string;
  pairs: CarryPair[];
}

export interface IntelligenceHubResponse {
  generated_at: string;
  locale: string;
  today_signals: TodaySignalSection;
  regime: RegimeSection;
  ratios: RatiosSection;
  correlations: CorrelationSection;
  news_impact: NewsImpactSection;
  macro_calendar: MacroCalendarSection;
  onchain: OnchainSection;
  bazaar: BazaarSpreadSection;
  fx_carry: FxCarrySection;
  disclaimers: string[];
}

export async function fetchIntelligenceHub(locale: 'tr' | 'en' = 'tr'): Promise<IntelligenceHubResponse> {
  const res = await apiClient.get<IntelligenceHubResponse>('/api/v1/intelligence/hub', {
    params: { locale },
  });
  return res.data;
}

export async function fetchIntelligenceToday(): Promise<TodaySignalSection> {
  const res = await apiClient.get<TodaySignalSection>('/api/v1/intelligence/today');
  return res.data;
}
