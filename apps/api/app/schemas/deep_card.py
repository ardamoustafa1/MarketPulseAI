"""
Per-asset "Deep Card" polymorphic schemas.

Each concrete card captures data that matters for that class of asset —
metals get bazaar premia + LBMA fix, crypto gets halving + ETF flow,
FX gets swap curve + real rate, equities get valuation + earnings,
commodities get seasonal patterns, ETFs get holdings/sector mix.

The dispatcher selects which card to build based on the resolved
`asset_class` taxonomy (stricter than the DB `AssetTypeEnum`).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AssetClass = Literal[
    "metal_gold",  # XAU, GRAMALTIN, HASALTIN, ATA*, CEYREK*, TAM*, YARIM*, GREMSE*
    "metal_silver",  # XAG, GUMUS*
    "metal_platinum",  # XPT, XPD, PLATIN*, PALADYUM*
    "crypto_major",  # BTC, ETH, SOL, BNB, XRP, ADA, AVAX, DOT, LTC
    "crypto_alt",  # MATIC, LINK, etc.
    "fx",  # USDTRY, EURUSD, GBPUSD, EURTRY ...
    "equity",  # AAPL, TSLA, etc. (BIST hisseleri)
    "index",  # ^GSPC, ^IXIC, XU100
    "etf",  # SPY, QQQ, GLD
    "commodity",  # CL=F, NG=F, HG=F, ZW=F (brent/doğalgaz/bakır/buğday)
]


# ────────────────────────────────────────────────────────────
# Common building blocks
# ────────────────────────────────────────────────────────────


class KeyMetric(BaseModel):
    label: str
    value: str
    change: str | None = None
    tone: Literal["positive", "negative", "neutral", "warning"] = "neutral"


class Bullet(BaseModel):
    text: str
    tone: Literal["positive", "negative", "neutral", "warning"] = "neutral"


class TargetProjection(BaseModel):
    target_label: str
    target_quantity: float
    monthly_addition: float
    months_to_target: float | None
    note: str


# ────────────────────────────────────────────────────────────
# Metals (gold / silver / platinum family)
# ────────────────────────────────────────────────────────────


class MetalsPremium(BaseModel):
    symbol: str
    label: str
    bazaar_price: float
    fair_value: float
    premium_pct: float
    verdict: Literal["rich", "fair", "cheap"]


class MetalsSpreadBucket(BaseModel):
    label: str  # e.g. "Gram altın Kapalıçarşı vs banka"
    difference_pct: float
    note: str


class LbmaFix(BaseModel):
    label: str  # e.g. "Londra AM Fix"
    time_utc: str  # HH:MM
    note: str | None = None


class MetalsDeepCard(BaseModel):
    asset_class: Literal["metal_gold", "metal_silver", "metal_platinum"]
    symbol: str
    label: str
    live_price_try: float | None = None
    live_price_usd: float | None = None
    live_price_gram_try: float | None = None
    premiums: list[MetalsPremium] = Field(default_factory=list)
    spreads: list[MetalsSpreadBucket] = Field(default_factory=list)
    lbma_fixes: list[LbmaFix] = Field(default_factory=list)
    inflation_shield_score: float | None = None  # −100..+100 ; pozitifse altın kalkan olmuş
    shield_narrative: str | None = None
    target_engine: TargetProjection | None = None
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# Crypto (major / alt)
# ────────────────────────────────────────────────────────────


class CryptoExchangeSpread(BaseModel):
    exchange: str  # "Binance TR", "BtcTurk", "Paribu"
    price_try: float
    spread_pct: float  # vs median
    last_updated: datetime | None = None


class LiquidationBand(BaseModel):
    price: float
    cumulative_usd: float
    side: Literal["long", "short"]


class StakingInfo(BaseModel):
    apy_pct: float
    protocol: str
    note: str | None = None


class CryptoMajorDeepCard(BaseModel):
    asset_class: Literal["crypto_major"]
    symbol: str
    label: str
    live_price_usd: float
    change_24h_pct: float | None = None
    change_7d_pct: float | None = None
    halving_countdown: dict[str, int] | None = None  # {"days": ..., "hours": ...}
    dominance_pct: float | None = None
    hash_rate_eh: float | None = None  # EH/s (BTC only)
    etf_net_flow_24h_musd: float | None = None
    staking: StakingInfo | None = None
    fear_greed_index: float | None = None
    liquidation_map: list[LiquidationBand] = Field(default_factory=list)
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


class CryptoAltDeepCard(BaseModel):
    asset_class: Literal["crypto_alt"]
    symbol: str
    label: str
    live_price_usd: float
    change_24h_pct: float | None = None
    realized_vol_24h_pct: float | None = None
    tvl_usd: float | None = None
    active_addresses_24h: int | None = None
    volume_24h_usd: float | None = None
    tr_exchange_spread: list[CryptoExchangeSpread] = Field(default_factory=list)
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# FX
# ────────────────────────────────────────────────────────────


class SwapPoint(BaseModel):
    tenor: str  # "1W", "1M", "3M", "6M", "1Y"
    points: float  # forward points
    implied_rate_pct: float


class FxReservePoint(BaseModel):
    date: str
    usd_billions: float


class FxDeepCard(BaseModel):
    asset_class: Literal["fx"]
    symbol: str
    label: str
    live_price: float
    change_24h_pct: float | None = None
    base_currency: str
    quote_currency: str
    swap_curve: list[SwapPoint] = Field(default_factory=list)
    real_interest_rate_pct: float | None = None
    tcmb_reserves_trend: list[FxReservePoint] = Field(default_factory=list)
    offshore_vs_onshore_spread_pct: float | None = None
    carry_score: float | None = None
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# Equity / Stocks
# ────────────────────────────────────────────────────────────


class EarningsEvent(BaseModel):
    date: str
    eps_estimate: float | None = None
    revenue_estimate_musd: float | None = None
    note: str | None = None


class EquityTechnical(BaseModel):
    rsi_14: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    fib_level: float | None = None
    narrative: str | None = None


class EquityDeepCard(BaseModel):
    asset_class: Literal["equity"]
    symbol: str
    label: str
    live_price: float
    change_24h_pct: float | None = None
    pe_ratio: float | None = None
    pb_ratio: float | None = None
    dividend_yield_pct: float | None = None
    market_cap_musd: float | None = None
    beta: float | None = None
    earnings_calendar: list[EarningsEvent] = Field(default_factory=list)
    technical: EquityTechnical | None = None
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# Commodity
# ────────────────────────────────────────────────────────────


class SeasonalMonth(BaseModel):
    month: int  # 1..12
    mean_return_pct: float
    hit_rate_pct: float


class CommodityDeepCard(BaseModel):
    asset_class: Literal["commodity"]
    symbol: str
    label: str
    live_price_usd: float
    change_24h_pct: float | None = None
    seasonal_pattern: list[SeasonalMonth] = Field(default_factory=list)
    supply_note: str | None = None  # OPEC / envanter vs.
    usd_correlation_90d: float | None = None
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# Index / ETF
# ────────────────────────────────────────────────────────────


class HoldingEntry(BaseModel):
    symbol: str
    name: str
    weight_pct: float


class SectorWeight(BaseModel):
    sector: str
    weight_pct: float
    change_30d_pct: float | None = None


class IndexEtfDeepCard(BaseModel):
    asset_class: Literal["index", "etf"]
    symbol: str
    label: str
    live_price: float
    change_24h_pct: float | None = None
    annualized_return_pct: float | None = None
    top_holdings: list[HoldingEntry] = Field(default_factory=list)
    sector_weights: list[SectorWeight] = Field(default_factory=list)
    key_metrics: list[KeyMetric] = Field(default_factory=list)
    bullets: list[Bullet] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────
# Aggregated response (discriminated union at runtime)
# ────────────────────────────────────────────────────────────


class DeepCardResponse(BaseModel):
    symbol: str
    asset_class: AssetClass
    generated_at: datetime
    # Exactly one of the following will be populated. Kept as separate optional
    # fields (rather than `Union` with discriminator) so the mobile TS client
    # can remain simple.
    metals: MetalsDeepCard | None = None
    crypto_major: CryptoMajorDeepCard | None = None
    crypto_alt: CryptoAltDeepCard | None = None
    fx: FxDeepCard | None = None
    equity: EquityDeepCard | None = None
    commodity: CommodityDeepCard | None = None
    index_etf: IndexEtfDeepCard | None = None
    disclaimers: list[str] = Field(default_factory=list)
