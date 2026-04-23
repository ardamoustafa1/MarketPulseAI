"""
Deep card builder for equities (single stocks, ABD + BIST).

Fundamentals are served from a static dictionary (deterministic fallback) that
can be later replaced with a real data provider (e.g., Finnhub). Technicals
come from the same historical close series we use for intelligence.
"""

from __future__ import annotations

from app.schemas.deep_card import (
    Bullet,
    EarningsEvent,
    EquityDeepCard,
    EquityTechnical,
    KeyMetric,
)
from app.services.intelligence.features import pct_change, safe_mean
from app.services.intelligence.history import load_many
from app.services.price.cache import get_cached_price

# Minimal fundamentals snapshot — swap with live feed in future sprint.
_FUND: dict[str, dict] = {
    "AAPL": {"pe": 30.5, "pb": 44.3, "div": 0.5, "mcap": 3_250_000, "beta": 1.21},
    "MSFT": {"pe": 34.1, "pb": 11.4, "div": 0.75, "mcap": 3_100_000, "beta": 0.92},
    "NVDA": {"pe": 62.0, "pb": 52.0, "div": 0.03, "mcap": 3_300_000, "beta": 1.75},
    "TSLA": {"pe": 58.7, "pb": 12.1, "div": 0.0, "mcap": 890_000, "beta": 2.05},
    "AMZN": {"pe": 44.0, "pb": 8.1, "div": 0.0, "mcap": 2_110_000, "beta": 1.15},
    "META": {"pe": 28.8, "pb": 8.0, "div": 0.4, "mcap": 1_430_000, "beta": 1.30},
    "GOOGL": {"pe": 25.5, "pb": 6.1, "div": 0.5, "mcap": 2_250_000, "beta": 1.03},
    "AKBNK.IS": {"pe": 4.2, "pb": 1.1, "div": 4.8, "mcap": 22_500, "beta": 1.10},
    "GARAN.IS": {"pe": 4.8, "pb": 1.2, "div": 5.2, "mcap": 28_000, "beta": 1.15},
    "THYAO.IS": {"pe": 6.5, "pb": 1.6, "div": 2.4, "mcap": 35_000, "beta": 1.25},
    "ASELS.IS": {"pe": 12.8, "pb": 4.5, "div": 0.3, "mcap": 11_000, "beta": 0.98},
}

_EARNINGS: dict[str, list[EarningsEvent]] = {
    "AAPL": [EarningsEvent(date="2026-05-02", eps_estimate=1.92, revenue_estimate_musd=95_200)],
    "NVDA": [EarningsEvent(date="2026-05-22", eps_estimate=5.80, revenue_estimate_musd=48_000)],
    "TSLA": [EarningsEvent(date="2026-07-23", eps_estimate=0.73, revenue_estimate_musd=27_300)],
    "MSFT": [EarningsEvent(date="2026-04-28", eps_estimate=3.15, revenue_estimate_musd=72_400)],
    "AMZN": [EarningsEvent(date="2026-05-01", eps_estimate=1.42, revenue_estimate_musd=168_500)],
}


def _rsi14(closes: list[float]) -> float | None:
    if len(closes) < 15:
        return None
    gains, losses = 0.0, 0.0
    for i in range(-14, 0):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gains += diff
        else:
            losses -= diff
    avg_gain = gains / 14
    avg_loss = losses / 14 if losses > 0 else 1e-9
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _macd(closes: list[float]) -> tuple[float | None, float | None]:
    if len(closes) < 30:
        return None, None

    def _ema(values: list[float], period: int) -> list[float]:
        k = 2 / (period + 1)
        ema = [values[0]]
        for v in values[1:]:
            ema.append(v * k + ema[-1] * (1 - k))
        return ema

    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_line = [a - b for a, b in zip(ema12, ema26, strict=False)]
    signal = _ema(macd_line[-18:], 9)
    return round(macd_line[-1], 4), round(signal[-1], 4)


def _tech_narrative(rsi: float | None, macd: float | None, sig: float | None) -> str:
    parts: list[str] = []
    if rsi is not None:
        if rsi > 70:
            parts.append("RSI aşırı alım bölgesinde (>70), düzeltme riski.")
        elif rsi < 30:
            parts.append("RSI aşırı satım bölgesinde (<30), toparlanma fırsatı olabilir.")
        else:
            parts.append(f"RSI {rsi:.0f} — nötr bölge.")
    if macd is not None and sig is not None:
        if macd > sig:
            parts.append("MACD sinyal çizgisinin üstünde — pozitif momentum.")
        else:
            parts.append("MACD sinyal çizgisinin altında — momentum zayıf.")
    return " ".join(parts) or "Teknik sinyaller nötr."


async def build_equity_card(symbol: str, label: str) -> EquityDeepCard:
    sym = symbol.upper()
    price_obj = await get_cached_price(sym)
    price = float(price_obj.price) if price_obj else 0.0
    change_24h = (
        float(price_obj.change_24h) if price_obj and price_obj.change_24h is not None else None
    )

    history = await load_many([sym], points=180)
    series = history.get(sym)

    rsi = _rsi14(series.closes) if series else None
    macd, sig = _macd(series.closes) if series else (None, None)

    fund = _FUND.get(sym, {})
    earnings = _EARNINGS.get(sym, [])

    tech = EquityTechnical(
        rsi_14=rsi,
        macd=macd,
        macd_signal=sig,
        narrative=_tech_narrative(rsi, macd, sig),
    )

    key_metrics: list[KeyMetric] = []
    if "pe" in fund:
        key_metrics.append(KeyMetric(label="F/K", value=f"{fund['pe']:.1f}"))
    if "pb" in fund:
        key_metrics.append(KeyMetric(label="PD/DD", value=f"{fund['pb']:.1f}"))
    if "div" in fund:
        key_metrics.append(
            KeyMetric(
                label="Temettü verimi",
                value=f"%{fund['div']:.1f}",
                tone="positive" if fund["div"] >= 2 else "neutral",
            )
        )
    if "mcap" in fund:
        mcap = fund["mcap"]
        suffix = "M ₺" if sym.endswith(".IS") else "M $"
        key_metrics.append(KeyMetric(label="Piyasa değeri", value=f"{mcap:,.0f}{suffix}"))
    if "beta" in fund:
        key_metrics.append(KeyMetric(label="Beta", value=f"{fund['beta']:.2f}"))
    if rsi is not None:
        key_metrics.append(
            KeyMetric(
                label="RSI(14)",
                value=f"{rsi:.0f}",
                tone="warning" if rsi > 70 or rsi < 30 else "neutral",
            )
        )

    bullets: list[Bullet] = []
    if earnings:
        nxt = earnings[0]
        bullets.append(
            Bullet(
                text=f"Sıradaki bilanço {nxt.date} — oynaklık bilanço haftasında artabilir.",
                tone="neutral",
            )
        )
    if rsi and rsi > 70:
        bullets.append(
            Bullet(text="Aşırı alım seviyesi — kısa vadeli kar realizasyonu riski.", tone="warning")
        )
    if series and len(series.closes) > 60:
        avg_return = safe_mean(pct_change(series.closes[-30:])) * 100
        if abs(avg_return) > 0.3:
            tone = "positive" if avg_return > 0 else "negative"
            bullets.append(
                Bullet(text=f"Son 30g ortalama günlük getiri %{avg_return:+.2f}.", tone=tone)
            )

    return EquityDeepCard(
        asset_class="equity",
        symbol=sym,
        label=label,
        live_price=price,
        change_24h_pct=change_24h,
        pe_ratio=fund.get("pe"),
        pb_ratio=fund.get("pb"),
        dividend_yield_pct=fund.get("div"),
        market_cap_musd=fund.get("mcap"),
        beta=fund.get("beta"),
        earnings_calendar=earnings,
        technical=tech,
        key_metrics=key_metrics,
        bullets=bullets,
    )
