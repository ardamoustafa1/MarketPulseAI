"""
Crypto on-chain pulse (proxy edition).

Production-grade on-chain data (Glassnode / Nansen / CryptoQuant) requires
paid keys which aren't in scope yet. As a professional first cut we build the
*same shape* of payload using purely public market data:

  * 7d realized volatility → proxy for market fear/greed.
  * 20d momentum vs 60d    → proxy for accumulation / distribution bias.
  * BTC halving countdown  → computed from the historical halving cadence.
  * Fear & Greed index     → from alternative.me's free endpoint (best-effort).

When alternative.me is offline we fall back to the momentum-derived proxy.
This keeps payloads identical shape so the UI doesn't conditionally render.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime

import httpx

from app.schemas.intelligence import OnchainAssetPulse, OnchainMetric, OnchainSection
from app.services.intelligence.features import annualized_vol, momentum, pct_change, safe_std
from app.services.intelligence.history import load_many

logger = logging.getLogger(__name__)

_ONCHAIN_UNIVERSE = ["BTC", "ETH", "SOL"]

# Next halvings (UTC-approximate). Used for the BTC countdown card.
_BTC_NEXT_HALVING = datetime(2028, 4, 20, 0, 0, tzinfo=UTC)


def btc_halving_countdown() -> tuple[int, int]:
    """Return (days, hours) until the next estimated BTC halving."""
    delta = _BTC_NEXT_HALVING - datetime.now(UTC)
    total_seconds = max(0, int(delta.total_seconds()))
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    return days, hours


async def _fetch_alt_fear_greed() -> float | None:
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                "https://api.alternative.me/fng/?limit=1",
                headers={"User-Agent": "MarketPulseAI/1.0"},
            )
            r.raise_for_status()
            data = r.json()
        value = int(data["data"][0]["value"])
        return float(value)
    except Exception as exc:  # noqa: BLE001
        logger.debug("onchain.fear_greed fetch failed: %s", exc)
        return None


async def build_onchain() -> OnchainSection:
    history = await load_many(_ONCHAIN_UNIVERSE, points=180)
    fear_greed = await _fetch_alt_fear_greed()

    assets: list[OnchainAssetPulse] = []
    for symbol in _ONCHAIN_UNIVERSE:
        series = history.get(symbol)
        if series is None or len(series.closes) < 30:
            continue

        mom_20 = momentum(series.closes, 20)
        mom_60 = momentum(series.closes, 60)
        accumulation = mom_20 - 0.5 * mom_60
        returns = pct_change(series.closes)
        vol_7d = safe_std(returns[-7:]) if len(returns) >= 7 else safe_std(returns)
        annual_vol = annualized_vol(returns[-60:])

        net_bias = "accumulation" if accumulation > 0.02 else (
            "distribution" if accumulation < -0.02 else "neutral"
        )

        # Derive a poor-man fear&greed when alternative.me is unavailable:
        # map 20d momentum to 0..100.
        derived_fg = 50 + mom_20 * 120  # −40% → 0, +40% → ~100
        derived_fg = max(0.0, min(100.0, derived_fg))

        metrics: list[OnchainMetric] = [
            OnchainMetric(
                key="momentum_20d",
                label="20g Momentum",
                value=round(mom_20 * 100, 3),
                unit="%",
                description="Son 20 günlük fiyat değişimi.",
            ),
            OnchainMetric(
                key="realized_vol_7d",
                label="7g Gerçekleşen Oynaklık",
                value=round(vol_7d * 100, 3),
                unit="%",
                description="Son 7 günün standart sapması.",
            ),
            OnchainMetric(
                key="annualized_vol_60d",
                label="Yıllık Oynaklık (60g)",
                value=round(annual_vol * 100, 3),
                unit="%",
                description="60 günlük getirilerden yıllıklandırılmış oynaklık.",
            ),
            OnchainMetric(
                key="accumulation_score",
                label="Birikim Skoru",
                value=round(accumulation, 4),
                description="20g − 0.5·60g momentum; pozitif = birikim, negatif = dağıtım.",
            ),
        ]

        halving_days = None
        if symbol == "BTC":
            delta = _BTC_NEXT_HALVING - datetime.now(UTC)
            halving_days = max(0, delta.days)
            metrics.append(
                OnchainMetric(
                    key="btc_halving_countdown",
                    label="Halving Geri Sayımı",
                    value=float(halving_days),
                    unit="gün",
                    description="Bir sonraki tahmini BTC halving tarihi.",
                )
            )

        fg_for_asset = fear_greed if (fear_greed is not None and symbol == "BTC") else derived_fg

        summary = _summarize(symbol, net_bias, mom_20, annual_vol, fg_for_asset)
        assets.append(
            OnchainAssetPulse(
                symbol=symbol,
                net_bias=net_bias,  # type: ignore[arg-type]
                fear_greed_index=round(fg_for_asset, 1),
                halving_days=halving_days,
                summary=summary,
                metrics=metrics,
            )
        )

    return OnchainSection(generated_at=datetime.now(UTC), assets=assets)


def _summarize(symbol: str, bias: str, mom_20: float, annual_vol: float, fg: float) -> str:
    bias_label = {
        "accumulation": "birikim lehine",
        "distribution": "dağıtım baskısı",
        "neutral": "dengeli",
    }[bias]
    fg_label = "güven (greed)" if fg >= 60 else ("korku (fear)" if fg <= 40 else "dengeli")
    return (
        f"{symbol}: {bias_label} · 20g momentum {mom_20 * 100:+.2f}% · "
        f"60g yıllık oynaklık {annual_vol * 100:.1f}% · piyasa psikolojisi {fg_label} ({fg:.0f})."
    )
