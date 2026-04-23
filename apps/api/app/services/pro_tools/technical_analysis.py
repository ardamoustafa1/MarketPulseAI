"""
Technical analysis panel.

Computes RSI-14, MACD (12/26/9), Bollinger Bands (20, 2σ), Fibonacci retracement
levels, a concise AI takeaway line, and a summary tone. Reuses the existing
`intelligence.history` close-series loader so everything stays cached + offline-safe.

This lives server-side so we can share the exact same math between the mobile
app, marketing exports, and any upcoming web/desktop surface.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Literal

from app.schemas.pro_tools import (
    FibonacciLevel,
    TAIndicator,
    TechnicalAnalysisView,
    Timeframe,
)
from app.services.intelligence.history import load_close_series

TIMEFRAME_POINTS: dict[Timeframe, int] = {
    "15m": 96,
    "1h": 168,
    "4h": 240,
    "1d": 180,
    "1w": 120,
}


def _rsi(closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    gains: list[float] = []
    losses: list[float] = []
    for i in range(1, period + 1):
        delta = closes[-i] - closes[-i - 1]
        if delta >= 0:
            gains.append(delta)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(delta))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1 + rs))


def _ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def _macd(closes: list[float]) -> tuple[float, float, float]:
    if len(closes) < 35:
        return 0.0, 0.0, 0.0
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_line = [a - b for a, b in zip(ema12, ema26, strict=False)]
    signal = _ema(macd_line[-9 * 3 :], 9)
    hist = macd_line[-1] - signal[-1] if signal else 0.0
    return macd_line[-1], signal[-1] if signal else 0.0, hist


def _bollinger(closes: list[float], period: int = 20, stddev: float = 2.0) -> dict[str, float]:
    if len(closes) < period:
        last = closes[-1] if closes else 0.0
        return {"middle": last, "upper": last, "lower": last, "bandwidth_pct": 0.0}
    window = closes[-period:]
    mean = sum(window) / period
    variance = sum((x - mean) ** 2 for x in window) / period
    sd = math.sqrt(variance)
    middle = mean
    upper = mean + stddev * sd
    lower = mean - stddev * sd
    bandwidth = ((upper - lower) / middle * 100) if middle else 0.0
    return {
        "middle": round(middle, 6),
        "upper": round(upper, 6),
        "lower": round(lower, 6),
        "bandwidth_pct": round(bandwidth, 4),
    }


def _fibonacci(closes: list[float]) -> list[FibonacciLevel]:
    if len(closes) < 30:
        return []
    high = max(closes[-60:]) if len(closes) >= 60 else max(closes)
    low = min(closes[-60:]) if len(closes) >= 60 else min(closes)
    last = closes[-1]
    span = high - low
    if span <= 0:
        return []
    ratios = [
        ("0.000", 0.0),
        ("0.236", 0.236),
        ("0.382", 0.382),
        ("0.500", 0.5),
        ("0.618", 0.618),
        ("0.786", 0.786),
        ("1.000", 1.0),
    ]
    levels: list[FibonacciLevel] = []
    for label, ratio in ratios:
        price = low + span * ratio
        dist = ((price - last) / last * 100) if last else 0.0
        levels.append(
            FibonacciLevel(label=label, value=round(price, 6), distance_pct=round(dist, 3))
        )
    return levels


def _support_resistance(closes: list[float]) -> tuple[list[float], list[float]]:
    if len(closes) < 40:
        return [], []
    tail = closes[-60:]
    sorted_values = sorted(tail)
    cut = max(2, len(sorted_values) // 10)
    support = sorted_values[:cut]
    resistance = sorted_values[-cut:]
    return (
        [round(support[0], 4), round(support[len(support) // 2], 4)],
        [round(resistance[-1], 4), round(resistance[len(resistance) // 2], 4)],
    )


def _classify_rsi(rsi: float) -> tuple[str, Literal["positive", "negative", "neutral", "warning"]]:
    if rsi >= 70:
        return "Aşırı alım bölgesinde — soğuma gerekebilir.", "warning"
    if rsi <= 30:
        return "Aşırı satım bölgesinde — tepki olasılığı.", "warning"
    if rsi >= 55:
        return "Yükseliş momentumu sağlam.", "positive"
    if rsi <= 45:
        return "Zayıflama işaretleri.", "negative"
    return "Nötr, yönsüz bir bölge.", "neutral"


def _summary_tone(rsi: float, macd_hist: float, last: float, bb_middle: float) -> str:
    score = 0
    if rsi >= 55:
        score += 1
    if rsi <= 45:
        score -= 1
    if macd_hist > 0:
        score += 1
    if macd_hist < 0:
        score -= 1
    if last > bb_middle:
        score += 1
    if last < bb_middle:
        score -= 1
    if score >= 2:
        return "bullish"
    if score <= -2:
        return "bearish"
    return "neutral"


def _takeaway(symbol: str, tone: str, rsi: float, macd_hist: float, bb: dict[str, float]) -> str:
    tone_tr = {"bullish": "güçlü", "bearish": "zayıf", "neutral": "kararsız"}[tone]
    bandwidth = bb.get("bandwidth_pct", 0.0)
    vol_hint = (
        "dar bant (olası patlama)"
        if bandwidth < 4
        else ("geniş bant (volatil)" if bandwidth > 10 else "normal bant")
    )
    macd_hint = (
        "MACD histogram pozitif" if macd_hist > 0 else "MACD histogram negatif"
    )
    return (
        f"{symbol} şu an {tone_tr} görünüyor — RSI {rsi:.1f}, {macd_hint}, {vol_hint}."
    )


async def build_technical_analysis(
    symbol: str,
    timeframe: Timeframe = "1d",
) -> TechnicalAnalysisView:
    sym = symbol.upper().strip()
    points = TIMEFRAME_POINTS.get(timeframe, 180)
    series = await load_close_series(sym, points=points)
    closes = list(series.closes)
    if len(closes) < 20:
        # Pad with a synthetic continuation so the math stays defined
        last = closes[-1] if closes else 100.0
        closes = [last] * 25 + closes

    rsi = _rsi(closes, 14)
    macd_line, macd_signal, macd_hist = _macd(closes)
    bb = _bollinger(closes)
    fibs = _fibonacci(closes)
    supports, resistances = _support_resistance(closes)

    rsi_caption, rsi_tone = _classify_rsi(rsi)

    tone_raw = _summary_tone(rsi, macd_hist, closes[-1], bb["middle"])
    summary_tone: Literal["bullish", "bearish", "neutral"] = (
        "bullish" if tone_raw == "bullish" else "bearish" if tone_raw == "bearish" else "neutral"
    )

    indicators: list[TAIndicator] = [
        TAIndicator(
            name="rsi_14",
            label="RSI 14",
            value=round(rsi, 2),
            tone=rsi_tone,
            caption=rsi_caption,
        ),
        TAIndicator(
            name="macd_hist",
            label="MACD Hist",
            value=round(macd_hist, 4),
            tone="positive" if macd_hist > 0 else "negative" if macd_hist < 0 else "neutral",
            caption="Yükseliş momentumu" if macd_hist > 0 else "Düşüş momentumu",
        ),
        TAIndicator(
            name="bb_bandwidth",
            label="BB Bandwidth",
            value=bb["bandwidth_pct"],
            tone="warning" if bb["bandwidth_pct"] < 4 else "neutral",
            caption=(
                "Dar bant — patlama olasılığı"
                if bb["bandwidth_pct"] < 4
                else "Geniş bant — volatil"
                if bb["bandwidth_pct"] > 10
                else "Normal bant"
            ),
        ),
    ]

    return TechnicalAnalysisView(
        symbol=sym,
        timeframe=timeframe,
        last_price=round(closes[-1], 6),
        summary_tone=summary_tone,
        ai_takeaway=_takeaway(sym, tone_raw, rsi, macd_hist, bb),
        indicators=indicators,
        bollinger=bb,
        macd={
            "line": round(macd_line, 6),
            "signal": round(macd_signal, 6),
            "histogram": round(macd_hist, 6),
        },
        rsi_14=round(rsi, 2),
        fibonacci=fibs,
        support_levels=supports,
        resistance_levels=resistances,
        generated_at=datetime.now(UTC),
    )
