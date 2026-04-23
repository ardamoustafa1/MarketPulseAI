"""
Volatility cone — compares the most recent realized volatility against the
historical percentile distribution of rolling-window volatilities over the
lookback period. Allows us to say things like "BTC is 28% calmer than usual".

The implied-volatility slot is reserved for providers such as Deribit / CBOE;
when absent we return `None` which the mobile UI hides gracefully.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Literal

from app.schemas.pro_tools import VolatilityBand, VolatilityConeView
from app.services.intelligence.history import load_close_series

ANNUALIZATION = math.sqrt(252)
PERCENTILES = (10, 25, 50, 75, 90)


def _returns(closes: list[float]) -> list[float]:
    return [
        math.log(closes[i] / closes[i - 1])
        for i in range(1, len(closes))
        if closes[i - 1] > 0 and closes[i] > 0
    ]


def _stdev(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    var = sum((x - mean) ** 2 for x in values) / len(values)
    return math.sqrt(var)


def _percentile(sorted_values: list[float], percentile: int) -> float:
    if not sorted_values:
        return 0.0
    k = (len(sorted_values) - 1) * (percentile / 100.0)
    f = int(math.floor(k))
    c = int(math.ceil(k))
    if f == c:
        return sorted_values[f]
    return sorted_values[f] * (c - k) + sorted_values[c] * (k - f)


def _rolling_vols(rets: list[float], window: int) -> list[float]:
    out: list[float] = []
    if len(rets) < window + 1:
        return out
    for i in range(window, len(rets) + 1):
        slice_ = rets[i - window : i]
        sd = _stdev(slice_)
        out.append(sd * ANNUALIZATION * 100)
    return out


def _regime(
    realized: float, p25: float, p75: float, p90: float
) -> Literal["calm", "normal", "elevated", "extreme"]:
    if realized >= p90:
        return "extreme"
    if realized >= p75:
        return "elevated"
    if realized <= p25:
        return "calm"
    return "normal"


async def build_volatility_cone(symbol: str, window_days: int = 30) -> VolatilityConeView:
    sym = symbol.upper().strip()
    series = await load_close_series(sym, points=max(180, window_days * 6))
    rets = _returns(series.closes)
    if len(rets) < window_days + 5:
        realized = _stdev(rets) * ANNUALIZATION * 100 if rets else 0.0
        bands = [
            VolatilityBand(percentile=p, annualized_vol_pct=round(realized, 2))
            for p in PERCENTILES
        ]
        return VolatilityConeView(
            symbol=sym,
            window_days=window_days,
            realized_vol_pct=round(realized, 2),
            implied_vol_pct=None,
            bands=bands,
            regime="normal",
            narrative=f"{sym} için yeterli veri yok — tahmini volatilite {realized:.1f}%",
            generated_at=datetime.now(UTC),
        )

    rolling = sorted(_rolling_vols(rets, window_days))
    bands = [
        VolatilityBand(percentile=p, annualized_vol_pct=round(_percentile(rolling, p), 2))
        for p in PERCENTILES
    ]
    realized = _stdev(rets[-window_days:]) * ANNUALIZATION * 100
    median = _percentile(rolling, 50)
    delta_pct = ((realized / median) - 1.0) * 100 if median else 0.0
    regime = _regime(
        realized,
        _percentile(rolling, 25),
        _percentile(rolling, 75),
        _percentile(rolling, 90),
    )
    narrative = (
        f"{sym} son {window_days} günde {realized:.1f}% volatilite üretti; "
        f"tarihsel medyanın {abs(delta_pct):.0f}% "
        f"{'üzerinde' if delta_pct >= 0 else 'altında'}. "
    )
    if regime == "calm":
        narrative += "Sakin rejim — patlama beklemek erken olabilir."
    elif regime == "extreme":
        narrative += "Ekstrem rejim — yönden bağımsız, geniş hareket riski yüksek."
    elif regime == "elevated":
        narrative += "Yükselen volatilite — pozisyon büyüklüğünü kontrol altında tut."
    else:
        narrative += "Normal rejim — bant dışına çıkarsa harekete geçme zamanı."

    return VolatilityConeView(
        symbol=sym,
        window_days=window_days,
        realized_vol_pct=round(realized, 2),
        implied_vol_pct=None,
        bands=bands,
        regime=regime,
        narrative=narrative,
        generated_at=datetime.now(UTC),
    )
