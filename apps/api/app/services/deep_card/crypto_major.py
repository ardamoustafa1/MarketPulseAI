"""
Deep card builder for major cryptocurrencies (BTC, ETH, SOL, BNB, etc.).

Feature matrix:
  * Halving countdown (BTC only)
  * Dominance proxy (computed from BTC/ETH top-N snapshot if available)
  * Hash-rate (best-effort; nullable if provider not configured)
  * ETF net flow (24h, MUSD) — static deterministic proxy if real feed absent
  * Staking APY for proof-of-stake chains
  * Fear & Greed (from alternative.me, cached)
  * Liquidation map bands (heuristic from realized vol)
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.deep_card import (
    Bullet,
    CryptoMajorDeepCard,
    KeyMetric,
    LiquidationBand,
    StakingInfo,
)
from app.services.intelligence.features import (
    annualized_vol,
    momentum,
    pct_change,
)
from app.services.intelligence.history import load_many
from app.services.intelligence.onchain import _fetch_alt_fear_greed, btc_halving_countdown
from app.services.price.cache import get_cached_price

_STAKING_APY: dict[str, StakingInfo] = {
    "ETH": StakingInfo(apy_pct=3.2, protocol="Beacon Chain", note="Validator ağ getirisi"),
    "SOL": StakingInfo(apy_pct=7.1, protocol="Solana", note="Nominal + inflation adj."),
    "ADA": StakingInfo(apy_pct=2.5, protocol="Cardano", note="Epoch rewards"),
    "DOT": StakingInfo(apy_pct=13.5, protocol="Polkadot", note="Active validator"),
    "AVAX": StakingInfo(apy_pct=7.8, protocol="Avalanche"),
    "BNB": StakingInfo(apy_pct=3.0, protocol="BNB Chain"),
    "ATOM": StakingInfo(apy_pct=15.6, protocol="Cosmos Hub"),
    "TRX": StakingInfo(apy_pct=4.4, protocol="Tron"),
}

# Very coarse ETF net-flow proxy (MUSD) — deterministic fallbacks for
# when a paid feed isn't wired. Real integration should replace this.
_ETF_PROXY_FLOW: dict[str, float] = {
    "BTC": 95.0,
    "ETH": 31.0,
}

# Approximate hash-rate snapshot (EH/s) — static fallback.
_HASH_RATE_EH: dict[str, float] = {"BTC": 742.0}


def _liquidation_bands(price: float, ann_vol: float) -> list[LiquidationBand]:
    """Heuristic band map — generates +/−(0.5σ, 1σ, 2σ) daily-equivalent zones."""
    if price <= 0 or ann_vol <= 0:
        return []
    daily = ann_vol / (252**0.5)
    bands: list[LiquidationBand] = []
    for mult, usd_weight in ((0.5, 45.0), (1.0, 120.0), (2.0, 240.0)):
        up = price * (1 + mult * daily)
        down = price * (1 - mult * daily)
        bands.append(
            LiquidationBand(price=round(up, 2), cumulative_usd=usd_weight * 1_000_000, side="short")
        )
        bands.append(
            LiquidationBand(
                price=round(down, 2), cumulative_usd=usd_weight * 1_000_000, side="long"
            )
        )
    bands.sort(key=lambda b: b.price)
    return bands


async def build_crypto_major_card(symbol: str, label: str) -> CryptoMajorDeepCard:
    sym = symbol.upper()

    price_obj = await get_cached_price(sym)
    price = float(price_obj.price) if price_obj else 0.0
    change_24h = (
        float(price_obj.change_24h) if price_obj and price_obj.change_24h is not None else None
    )

    history = await load_many([sym, "BTC", "ETH"], points=240)
    series = history.get(sym)

    change_7d_pct: float | None = None
    ann_vol: float | None = None
    if series is not None and len(series.closes) >= 10:
        change_7d_pct = round(momentum(series.closes, 7) * 100, 3)
        ann_vol = annualized_vol(pct_change(series.closes[-90:]))

    # BTC dominance proxy — BTC price vs (BTC+ETH) live market-cap. True
    # dominance needs global mcap; this is a rough local approximation.
    dominance_pct: float | None = None
    if sym == "BTC":
        btc = history.get("BTC")
        eth = history.get("ETH")
        if btc and eth and btc.closes and eth.closes:
            btc_share = btc.closes[-1] * 19_700_000  # circulating supply approx
            eth_share = eth.closes[-1] * 120_200_000
            total = btc_share + eth_share
            if total > 0:
                dominance_pct = round(btc_share / total * 100, 2)

    # Halving countdown (BTC only)
    halving_countdown = None
    if sym == "BTC":
        days, hours = btc_halving_countdown()
        halving_countdown = {"days": days, "hours": hours}

    # Fear & Greed
    fg = await _fetch_alt_fear_greed()

    staking = _STAKING_APY.get(sym)
    hash_rate = _HASH_RATE_EH.get(sym)
    etf_flow = _ETF_PROXY_FLOW.get(sym)

    # Liquidation map
    liqmap = _liquidation_bands(price, ann_vol or 0.0)

    key_metrics: list[KeyMetric] = []
    if change_7d_pct is not None:
        key_metrics.append(
            KeyMetric(
                label="7g değişim",
                value=f"{change_7d_pct:+.2f}%",
                tone="positive" if change_7d_pct > 0 else "negative",
            )
        )
    if ann_vol:
        key_metrics.append(
            KeyMetric(
                label="90g yıllık vol",
                value=f"{ann_vol * 100:.1f}%",
                tone="warning" if ann_vol > 0.9 else "neutral",
            )
        )
    if fg is not None:
        key_metrics.append(
            KeyMetric(
                label="Korku / Açgözlülük",
                value=f"{fg:.0f}",
                tone="warning" if fg >= 75 else "positive" if fg >= 55 else "neutral",
            )
        )
    if dominance_pct:
        key_metrics.append(KeyMetric(label="BTC dominance (proxy)", value=f"{dominance_pct:.1f}%"))
    if etf_flow is not None:
        key_metrics.append(
            KeyMetric(
                label="ETF 24s net akış",
                value=f"${etf_flow:+.1f}M",
                tone="positive" if etf_flow > 0 else "negative",
            )
        )
    if staking:
        key_metrics.append(
            KeyMetric(label="Staking APY", value=f"{staking.apy_pct:.1f}%", tone="positive")
        )

    bullets: list[Bullet] = []
    if halving_countdown:
        bullets.append(
            Bullet(
                text=(
                    f"Halving'e {halving_countdown['days']} gün kaldı — "
                    "tarihsel olarak 180 gün öncesi birikim penceresi."
                ),
                tone="neutral",
            )
        )
    if fg is not None and fg >= 75:
        bullets.append(Bullet(text="Aşırı açgözlülük bölgesi — FOMO riski yüksek.", tone="warning"))
    elif fg is not None and fg <= 25:
        bullets.append(
            Bullet(
                text="Aşırı korku — tarihsel olarak birikim fırsatları bu bölgelerde.",
                tone="positive",
            )
        )
    if etf_flow is not None and etf_flow > 50:
        bullets.append(
            Bullet(text="Kurumsal ETF girişi güçlü — momentum destekçisi.", tone="positive")
        )

    return CryptoMajorDeepCard(
        asset_class="crypto_major",
        symbol=sym,
        label=label,
        live_price_usd=price,
        change_24h_pct=change_24h,
        change_7d_pct=change_7d_pct,
        halving_countdown=halving_countdown,
        dominance_pct=dominance_pct,
        hash_rate_eh=hash_rate,
        etf_net_flow_24h_musd=etf_flow,
        staking=staking,
        fear_greed_index=fg,
        liquidation_map=liqmap,
        key_metrics=key_metrics,
        bullets=bullets,
    )


def _now_utc() -> datetime:
    return datetime.now(UTC)
