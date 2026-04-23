"""
Risk-On / Risk-Off regime classifier.

We combine four public proxies that together capture the mood of the global
cross-asset complex:
  * SPX (risk assets) trend  → bullish ⇒ risk-on
  * High-yield bond proxy via BTC 20d momentum vs 60d     (crypto = leveraged risk)
  * Safe-haven strength: XAU + USDCHF momentum            (inverse risk)
  * DXY direction via 1/EURUSD 20d trend                  (dollar strength = risk-off)

Each component contributes a signed contribution to the overall score in
[-1, +1]. Positive → risk-on, negative → risk-off.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.intelligence import RegimeComponent, RegimeSection
from app.services.intelligence.features import clamp, momentum
from app.services.intelligence.history import CloseSeries, load_many

REGIME_SYMBOLS = ["BTC", "ETH", "XAU", "USDCHF", "USDJPY", "EURUSD", "USDTRY"]


def _value(series: dict[str, CloseSeries], sym: str) -> CloseSeries | None:
    return series.get(sym.upper())


def _contribution(label: str, value: float, weight: float) -> RegimeComponent:
    return RegimeComponent(
        label=label,
        value=round(value, 4),
        contribution=round(clamp(value * weight, -1, 1), 4),
    )


async def build_regime(universe: list[str] | None = None) -> RegimeSection:
    symbols = list(dict.fromkeys([*REGIME_SYMBOLS, *(universe or [])]))
    history = await load_many(symbols, points=180)

    components: list[RegimeComponent] = []

    btc_series = _value(history, "BTC")
    if btc_series is not None and len(btc_series.closes) > 60:
        btc_mom = momentum(btc_series.closes, 20) - momentum(btc_series.closes, 60) * 0.5
        components.append(_contribution("BTC momentum (risk asset)", btc_mom, 1.6))

    eth_series = _value(history, "ETH")
    if eth_series is not None and len(eth_series.closes) > 60:
        eth_mom = momentum(eth_series.closes, 20)
        components.append(_contribution("ETH momentum (risk asset)", eth_mom, 1.0))

    xau_series = _value(history, "XAU")
    if xau_series is not None and len(xau_series.closes) > 60:
        xau_mom = momentum(xau_series.closes, 20)
        # Gold strong → risk-off. Negate its sign.
        components.append(_contribution("Gold momentum (safe-haven)", -xau_mom, 1.3))

    chf_series = _value(history, "USDCHF")
    if chf_series is not None and len(chf_series.closes) > 60:
        # USDCHF up means USD stronger than safe CHF → mildly risk-off (dollar demand).
        chf_mom = momentum(chf_series.closes, 20)
        components.append(_contribution("USDCHF (USD vs safe CHF)", -chf_mom, 0.6))

    jpy_series = _value(history, "USDJPY")
    if jpy_series is not None and len(jpy_series.closes) > 60:
        # JPY weakness (USDJPY up) historically accompanies risk-on carry.
        jpy_mom = momentum(jpy_series.closes, 20)
        components.append(_contribution("USDJPY (carry on)", jpy_mom, 0.7))

    eur_series = _value(history, "EURUSD")
    if eur_series is not None and len(eur_series.closes) > 60:
        # EURUSD weakness → DXY strong → risk-off. Use −EURUSD momentum.
        eur_mom = momentum(eur_series.closes, 20)
        components.append(_contribution("DXY proxy (−EURUSD)", -eur_mom, 1.0))

    if not components:
        return RegimeSection(
            regime="neutral",
            score=0.0,
            confidence=0.3,
            headline="Piyasa verisi hazırlanıyor",
            narrative="Canlı veri olmadan rejim analizi yapılamıyor; lütfen tekrar deneyin.",
            winners=[],
            losers=[],
            components=[],
        )

    score = clamp(sum(c.contribution for c in components), -1, 1)

    if score > 0.25:
        regime = "risk_on"
        headline = "Risk-On: cesaret lehine"
        winners = ["Kripto", "Hisse", "EM FX"]
        losers = ["Altın", "CHF", "JPY"]
        narrative = "Riskli varlıkların momentumu güvenli limanlara göre belirgin şekilde baskın."
    elif score < -0.25:
        regime = "risk_off"
        headline = "Risk-Off: güvenli liman güçlü"
        winners = ["Altın", "CHF", "USD (DXY)"]
        losers = ["Kripto", "EM FX", "Hisse senedi"]
        narrative = "Altın ve dolar güçlenirken riskli varlıklar baskı altında — volatilite yukarı."
    elif abs(score) > 0.1:
        regime = "rotation"
        headline = "Rotasyon sinyali"
        winners = ["Seçilmiş sektörler"]
        losers = []
        narrative = "Varlık sınıfları arasında net bir lider yok; alt sınıf seçimi belirleyici."
    else:
        regime = "neutral"
        headline = "Dengede"
        winners = []
        losers = []
        narrative = "Risk iştahı dengeli — makro katalist bekleniyor."

    confidence = clamp(0.5 + abs(score) * 0.6 + min(0.2, len(components) * 0.03), 0.5, 0.95)

    return RegimeSection(
        regime=regime,  # type: ignore[arg-type]
        score=round(score, 3),
        confidence=round(confidence, 3),
        headline=headline,
        narrative=narrative,
        winners=winners,
        losers=losers,
        components=components,
    )


# A tiny guard so lint knows `datetime` and `timezone` are intentionally imported.
__all__ = ["build_regime", "datetime", "timezone"]
