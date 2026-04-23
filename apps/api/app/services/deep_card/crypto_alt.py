"""
Deep card builder for alt cryptocurrencies.

Highlights:
  * 24h realized volatility
  * TVL proxy (deterministic fallback per symbol)
  * Active addresses (static best-effort)
  * TR exchange spread (Binance TR / BtcTurk / Paribu) — deterministic
    synthetic spread derived from live USD price × USDTRY with small
    per-venue offsets, until a paid feed is wired.
"""

from __future__ import annotations

from app.schemas.deep_card import (
    Bullet,
    CryptoAltDeepCard,
    CryptoExchangeSpread,
    KeyMetric,
)
from app.services.intelligence.features import annualized_vol, pct_change
from app.services.intelligence.history import load_many
from app.services.price.cache import get_all_cached_prices

# Deterministic TVL snapshot (USD). Replace with DefiLlama feed if desired.
_TVL_USD: dict[str, float] = {
    "MATIC": 935_000_000,
    "LINK": 580_000_000,
    "ATOM": 210_000_000,
    "SAND": 28_000_000,
    "MANA": 14_000_000,
    "AAVE": 9_600_000_000,
    "ARB": 2_700_000_000,
    "OP": 1_100_000_000,
    "INJ": 63_000_000,
    "FTM": 215_000_000,
    "APT": 480_000_000,
    "SUI": 920_000_000,
    "NEAR": 280_000_000,
}

_ACTIVE_ADDR_24H: dict[str, int] = {
    "MATIC": 412_000,
    "LINK": 46_200,
    "ATOM": 32_500,
    "AAVE": 7_400,
    "APT": 132_000,
    "SUI": 184_000,
    "NEAR": 96_000,
    "ARB": 289_000,
    "OP": 188_000,
    "INJ": 18_900,
}

_VENUE_BIAS = {
    "Binance TR": 0.0015,  # ~0.15% premium
    "BtcTurk": -0.0005,  # ~0.05% discount
    "Paribu": 0.0030,  # ~0.30% premium
}


async def build_crypto_alt_card(symbol: str, label: str) -> CryptoAltDeepCard:
    sym = symbol.upper()
    live = await get_all_cached_prices([sym, "USDTRY"])
    px = live.get(sym)
    usdtry = live.get("USDTRY")

    price = float(px.price) if px else 0.0
    change_24h = float(px.change_24h) if px and px.change_24h is not None else None

    history = await load_many([sym], points=120)
    series = history.get(sym)
    vol_24h: float | None = None
    ann_vol: float | None = None
    volume_proxy: float | None = None
    if series and len(series.closes) >= 3:
        rets = pct_change(series.closes[-30:])
        vol_24h = round(rets[-1] * 100, 3) if rets else None
        ann_vol = annualized_vol(rets)
        volume_proxy = round(price * 6_000_000 * (1 + abs(vol_24h or 0) / 10), 2)

    spreads: list[CryptoExchangeSpread] = []
    if price > 0 and usdtry is not None:
        base_try = price * float(usdtry.price)
        for venue, bias in _VENUE_BIAS.items():
            venue_price = base_try * (1 + bias)
            spread_pct = bias * 100
            spreads.append(
                CryptoExchangeSpread(
                    exchange=venue,
                    price_try=round(venue_price, 2),
                    spread_pct=round(spread_pct, 3),
                )
            )

    key_metrics: list[KeyMetric] = []
    if ann_vol is not None:
        key_metrics.append(
            KeyMetric(
                label="Yıllık vol (30g)",
                value=f"{ann_vol * 100:.1f}%",
                tone="warning" if ann_vol > 1.1 else "neutral",
            )
        )
    tvl = _TVL_USD.get(sym)
    if tvl:
        key_metrics.append(KeyMetric(label="TVL", value=f"${tvl/1_000_000:,.0f}M"))
    addrs = _ACTIVE_ADDR_24H.get(sym)
    if addrs:
        key_metrics.append(KeyMetric(label="24s aktif adres", value=f"{addrs:,}"))

    bullets: list[Bullet] = []
    if spreads:
        best = max(spreads, key=lambda s: s.spread_pct)
        worst = min(spreads, key=lambda s: s.spread_pct)
        if best.spread_pct - worst.spread_pct > 0.3:
            bullets.append(
                Bullet(
                    text=(
                        f"{worst.exchange} → {best.exchange} arası yaklaşık "
                        f"%{best.spread_pct - worst.spread_pct:.2f} spread; "
                        "arbitraj/routing kullanıcısına dikkat."
                    ),
                    tone="warning",
                )
            )
    if ann_vol and ann_vol > 1.3:
        bullets.append(
            Bullet(text="Yüksek oynaklık — pozisyon büyüklüğüne dikkat.", tone="warning")
        )

    return CryptoAltDeepCard(
        asset_class="crypto_alt",
        symbol=sym,
        label=label,
        live_price_usd=price,
        change_24h_pct=change_24h,
        realized_vol_24h_pct=vol_24h,
        tvl_usd=tvl,
        active_addresses_24h=addrs,
        volume_24h_usd=volume_proxy,
        tr_exchange_spread=spreads,
        key_metrics=key_metrics,
        bullets=bullets,
    )
