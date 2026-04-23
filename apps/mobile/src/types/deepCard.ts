export type AssetClass =
  | 'metal_gold'
  | 'metal_silver'
  | 'metal_platinum'
  | 'crypto_major'
  | 'crypto_alt'
  | 'fx'
  | 'equity'
  | 'index'
  | 'etf'
  | 'commodity';

export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface KeyMetric {
  label: string;
  value: string;
  change?: string | null;
  tone?: Tone;
}

export interface Bullet {
  text: string;
  tone?: Tone;
}

export interface TargetProjection {
  target_label: string;
  target_quantity: number;
  monthly_addition: number;
  months_to_target: number | null;
  note: string;
}

// Metals
export interface MetalsPremium {
  symbol: string;
  label: string;
  bazaar_price: number;
  fair_value: number;
  premium_pct: number;
  verdict: 'rich' | 'fair' | 'cheap';
}
export interface MetalsSpreadBucket {
  label: string;
  difference_pct: number;
  note: string;
}
export interface LbmaFix {
  label: string;
  time_utc: string;
  note?: string | null;
}
export interface MetalsDeepCard {
  asset_class: 'metal_gold' | 'metal_silver' | 'metal_platinum';
  symbol: string;
  label: string;
  live_price_try?: number | null;
  live_price_usd?: number | null;
  live_price_gram_try?: number | null;
  premiums: MetalsPremium[];
  spreads: MetalsSpreadBucket[];
  lbma_fixes: LbmaFix[];
  inflation_shield_score?: number | null;
  shield_narrative?: string | null;
  target_engine?: TargetProjection | null;
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

// Crypto
export interface CryptoExchangeSpread {
  exchange: string;
  price_try: number;
  spread_pct: number;
  last_updated?: string | null;
}
export interface LiquidationBand {
  price: number;
  cumulative_usd: number;
  side: 'long' | 'short';
}
export interface StakingInfo {
  apy_pct: number;
  protocol: string;
  note?: string | null;
}
export interface CryptoMajorDeepCard {
  asset_class: 'crypto_major';
  symbol: string;
  label: string;
  live_price_usd: number;
  change_24h_pct?: number | null;
  change_7d_pct?: number | null;
  halving_countdown?: { days: number; hours: number } | null;
  dominance_pct?: number | null;
  hash_rate_eh?: number | null;
  etf_net_flow_24h_musd?: number | null;
  staking?: StakingInfo | null;
  fear_greed_index?: number | null;
  liquidation_map: LiquidationBand[];
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}
export interface CryptoAltDeepCard {
  asset_class: 'crypto_alt';
  symbol: string;
  label: string;
  live_price_usd: number;
  change_24h_pct?: number | null;
  realized_vol_24h_pct?: number | null;
  tvl_usd?: number | null;
  active_addresses_24h?: number | null;
  volume_24h_usd?: number | null;
  tr_exchange_spread: CryptoExchangeSpread[];
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

// FX
export interface SwapPoint {
  tenor: string;
  points: number;
  implied_rate_pct: number;
}
export interface FxReservePoint {
  date: string;
  usd_billions: number;
}
export interface FxDeepCard {
  asset_class: 'fx';
  symbol: string;
  label: string;
  live_price: number;
  change_24h_pct?: number | null;
  base_currency: string;
  quote_currency: string;
  swap_curve: SwapPoint[];
  real_interest_rate_pct?: number | null;
  tcmb_reserves_trend: FxReservePoint[];
  offshore_vs_onshore_spread_pct?: number | null;
  carry_score?: number | null;
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

// Equity
export interface EarningsEvent {
  date: string;
  eps_estimate?: number | null;
  revenue_estimate_musd?: number | null;
  note?: string | null;
}
export interface EquityTechnical {
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  fib_level?: number | null;
  narrative?: string | null;
}
export interface EquityDeepCard {
  asset_class: 'equity';
  symbol: string;
  label: string;
  live_price: number;
  change_24h_pct?: number | null;
  pe_ratio?: number | null;
  pb_ratio?: number | null;
  dividend_yield_pct?: number | null;
  market_cap_musd?: number | null;
  beta?: number | null;
  earnings_calendar: EarningsEvent[];
  technical?: EquityTechnical | null;
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

// Commodity
export interface SeasonalMonth {
  month: number;
  mean_return_pct: number;
  hit_rate_pct: number;
}
export interface CommodityDeepCard {
  asset_class: 'commodity';
  symbol: string;
  label: string;
  live_price_usd: number;
  change_24h_pct?: number | null;
  seasonal_pattern: SeasonalMonth[];
  supply_note?: string | null;
  usd_correlation_90d?: number | null;
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

// Index / ETF
export interface HoldingEntry {
  symbol: string;
  name: string;
  weight_pct: number;
}
export interface SectorWeight {
  sector: string;
  weight_pct: number;
  change_30d_pct?: number | null;
}
export interface IndexEtfDeepCard {
  asset_class: 'index' | 'etf';
  symbol: string;
  label: string;
  live_price: number;
  change_24h_pct?: number | null;
  annualized_return_pct?: number | null;
  top_holdings: HoldingEntry[];
  sector_weights: SectorWeight[];
  key_metrics: KeyMetric[];
  bullets: Bullet[];
}

export interface DeepCardResponse {
  symbol: string;
  asset_class: AssetClass;
  generated_at: string;
  metals?: MetalsDeepCard | null;
  crypto_major?: CryptoMajorDeepCard | null;
  crypto_alt?: CryptoAltDeepCard | null;
  fx?: FxDeepCard | null;
  equity?: EquityDeepCard | null;
  commodity?: CommodityDeepCard | null;
  index_etf?: IndexEtfDeepCard | null;
  disclaimers: string[];
}
