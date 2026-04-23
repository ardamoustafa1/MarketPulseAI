"""
Pure maths utilities for the intelligence services.

Kept free of I/O so they're trivial to unit-test and compose.
"""
from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from statistics import fmean, pstdev


def pct_change(series: Sequence[float]) -> list[float]:
    """Daily percentage returns; skips zero or missing previous values."""
    out: list[float] = []
    for prev, curr in zip(series, series[1:], strict=False):
        if prev == 0:
            continue
        out.append((curr - prev) / prev)
    return out


def safe_mean(values: Iterable[float]) -> float:
    seq = [v for v in values if math.isfinite(v)]
    if not seq:
        return 0.0
    return fmean(seq)


def safe_std(values: Iterable[float]) -> float:
    seq = [v for v in values if math.isfinite(v)]
    if len(seq) < 2:
        return 0.0
    return pstdev(seq)


def zscore(value: float, ref: Sequence[float]) -> float:
    m = safe_mean(ref)
    s = safe_std(ref)
    if s == 0:
        return 0.0
    return (value - m) / s


def percentile_rank(value: float, ref: Sequence[float]) -> float:
    if not ref:
        return 50.0
    below = sum(1 for r in ref if r < value)
    return 100.0 * below / len(ref)


def momentum(series: Sequence[float], lookback: int) -> float:
    """Percent change over the last `lookback` bars."""
    if len(series) <= lookback:
        return 0.0
    base = series[-lookback - 1]
    if base == 0:
        return 0.0
    return (series[-1] - base) / base


def rolling_correlation(a: Sequence[float], b: Sequence[float]) -> float:
    n = min(len(a), len(b))
    if n < 10:
        return 0.0
    a_tail, b_tail = a[-n:], b[-n:]
    mean_a = safe_mean(a_tail)
    mean_b = safe_mean(b_tail)
    num = 0.0
    den_a = 0.0
    den_b = 0.0
    for x, y in zip(a_tail, b_tail, strict=False):
        da = x - mean_a
        db = y - mean_b
        num += da * db
        den_a += da * da
        den_b += db * db
    if den_a == 0 or den_b == 0:
        return 0.0
    return max(-1.0, min(1.0, num / math.sqrt(den_a * den_b)))


def annualized_vol(returns: Sequence[float]) -> float:
    if len(returns) < 2:
        return 0.0
    return safe_std(returns) * math.sqrt(252)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def sigmoid(x: float) -> float:
    if x > 500:
        return 1.0
    if x < -500:
        return 0.0
    return 1.0 / (1.0 + math.exp(-x))
