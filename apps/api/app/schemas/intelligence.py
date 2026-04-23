"""
Schemas for the Cross-Asset Intelligence Hub.

The Hub is a single aggregator endpoint that returns every intelligence section
in one request. Each section has its own schema so consumers can render/cache
per-section without depending on the rest.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SignalAction = Literal["BUY", "SELL", "HOLD", "REDUCE_RISK", "ADD_RISK", "PROTECT"]
SeverityLevel = Literal["positive", "negative", "neutral", "warning"]
RegimeType = Literal["risk_on", "risk_off", "neutral", "rotation"]


# ──────────────────────────────────────────────────────────────────────────
# 1. Today's Signal (per asset + portfolio overview)
# ──────────────────────────────────────────────────────────────────────────


class AssetSignal(BaseModel):
    symbol: str
    asset_type: str
    action: SignalAction
    confidence: float = Field(..., ge=0, le=1)
    rationale: str
    score: float = Field(..., description="Composite score −1..+1; positive is bullish")
    momentum_pct: float
    volatility_z: float
    last_price: float | None = None
    change_24h_pct: float | None = None
    historical_hit_rate: float | None = Field(
        None,
        description="0..1 rolling hit rate of the same signal family over 30d",
    )


class PortfolioSignal(BaseModel):
    action: SignalAction
    confidence: float = Field(..., ge=0, le=1)
    headline: str
    rationale: str
    net_bullish: int
    net_bearish: int
    dominant_asset_type: str | None = None
    portfolio_volatility: float | None = None


class TodaySignalSection(BaseModel):
    generated_at: datetime
    portfolio: PortfolioSignal | None = None
    assets: list[AssetSignal] = Field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────
# 2. Regime Detector
# ──────────────────────────────────────────────────────────────────────────


class RegimeComponent(BaseModel):
    label: str
    value: float
    contribution: float


class RegimeSection(BaseModel):
    regime: RegimeType
    score: float = Field(..., description="−1 = strongly risk-off, +1 = strongly risk-on")
    confidence: float = Field(..., ge=0, le=1)
    headline: str
    narrative: str
    winners: list[str]
    losers: list[str]
    components: list[RegimeComponent]


# ──────────────────────────────────────────────────────────────────────────
# 3. Cross-Asset Ratios & Spreads Radar
# ──────────────────────────────────────────────────────────────────────────


class RatioSignal(BaseModel):
    key: str
    label: str
    value: float
    z_score: float = Field(..., description="Current value vs 180-day distribution")
    percentile: float = Field(..., ge=0, le=100)
    direction: Literal["extreme_low", "low", "normal", "high", "extreme_high"]
    historical_reaction: str | None = None
    unit: str | None = None


class RatiosSection(BaseModel):
    generated_at: datetime
    entries: list[RatioSignal]


# ──────────────────────────────────────────────────────────────────────────
# 4. Correlation Heatmap
# ──────────────────────────────────────────────────────────────────────────


class CorrelationCell(BaseModel):
    row: str
    col: str
    value: float


class CorrelationHighlight(BaseModel):
    pair: tuple[str, str]
    value: float
    delta_vs_90d_prior: float
    message: str


class CorrelationSection(BaseModel):
    window_days: int
    symbols: list[str]
    matrix: list[list[float]]
    cells: list[CorrelationCell]
    highlights: list[CorrelationHighlight]


# ──────────────────────────────────────────────────────────────────────────
# 5. News → Wallet Impact (multi-asset)
# ──────────────────────────────────────────────────────────────────────────


class NewsAssetImpact(BaseModel):
    symbol: str
    expected_move_pct: float
    monetary_impact: float
    direction: Literal["up", "down", "flat"]


class NewsImpactItem(BaseModel):
    id: str
    title: str
    source: str
    link: str | None = None
    published_at: str | None = None
    severity: SeverityLevel
    portfolio_impact: float = Field(
        ...,
        description="Estimated TRY/USD impact on the user's portfolio",
    )
    impact_currency: Literal["TRY", "USD"] = "USD"
    tags: list[str] = Field(default_factory=list)
    assets: list[NewsAssetImpact] = Field(default_factory=list)
    summary: str | None = None


class NewsImpactSection(BaseModel):
    generated_at: datetime
    items: list[NewsImpactItem]


# ──────────────────────────────────────────────────────────────────────────
# 6. Macro Calendar
# ──────────────────────────────────────────────────────────────────────────


class HistoricalReactionSample(BaseModel):
    symbol: str
    mean_pct: float
    win_rate: float
    sample_size: int


class MacroEvent(BaseModel):
    id: str
    title: str
    country: str
    category: Literal["central_bank", "macro_print", "commodity", "earnings", "geopolitics"]
    scheduled_at: datetime
    importance: Literal["low", "medium", "high"]
    summary: str
    expected_impact: list[HistoricalReactionSample]


class MacroCalendarSection(BaseModel):
    window_days: int
    events: list[MacroEvent]


# ──────────────────────────────────────────────────────────────────────────
# 7. On-chain Pulse (Crypto)
# ──────────────────────────────────────────────────────────────────────────


class OnchainMetric(BaseModel):
    key: str
    label: str
    value: float
    unit: str | None = None
    trend_pct_24h: float | None = None
    description: str | None = None


class OnchainAssetPulse(BaseModel):
    symbol: str
    net_bias: Literal["accumulation", "distribution", "neutral"]
    fear_greed_index: float | None = None
    halving_days: int | None = None
    summary: str
    metrics: list[OnchainMetric]


class OnchainSection(BaseModel):
    generated_at: datetime
    assets: list[OnchainAssetPulse]


# ──────────────────────────────────────────────────────────────────────────
# 8. LBMA vs Kapalıçarşı spread
# ──────────────────────────────────────────────────────────────────────────


class BazaarInstrument(BaseModel):
    symbol: str
    label: str
    bazaar_price: float
    fair_value: float
    premium_pct: float
    verdict: Literal["rich", "fair", "cheap"]


class BazaarSpreadSection(BaseModel):
    lbma_reference_usd: float
    usdtry: float
    gram_fair_try: float
    reasonable_bid_ask_pct: float
    narrative: str
    instruments: list[BazaarInstrument]


# ──────────────────────────────────────────────────────────────────────────
# 9. FX Carry Score
# ──────────────────────────────────────────────────────────────────────────


class CarryPair(BaseModel):
    pair: str
    base_rate: float
    quote_rate: float
    carry_pct: float
    momentum_pct: float
    score: float
    verdict: Literal["attractive", "neutral", "avoid"]
    rationale: str


class FxCarrySection(BaseModel):
    generated_at: datetime
    reference_currency: str
    pairs: list[CarryPair]


# ──────────────────────────────────────────────────────────────────────────
# Aggregator response
# ──────────────────────────────────────────────────────────────────────────


class IntelligenceHubResponse(BaseModel):
    generated_at: datetime
    locale: str = "tr"
    today_signals: TodaySignalSection
    regime: RegimeSection
    ratios: RatiosSection
    correlations: CorrelationSection
    news_impact: NewsImpactSection
    macro_calendar: MacroCalendarSection
    onchain: OnchainSection
    bazaar: BazaarSpreadSection
    fx_carry: FxCarrySection
    disclaimers: list[str] = Field(default_factory=list)
