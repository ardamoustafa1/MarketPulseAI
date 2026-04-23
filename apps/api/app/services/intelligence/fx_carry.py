"""
FX carry & rate differential scorer.

Policy rates change infrequently so we ship a professionally maintained static
table and **augment** it with 60-day momentum from the live history. The score
combines:
  carry  = base rate − quote rate
  trend  = 60-day momentum of the pair (strong trend = carry can be captured)
  risk   = realized 60-day volatility (high vol discounts the carry)

`score = carry% − 0.25 * (vol_annualized - 10%) + 0.5 * trend%`

All the inputs are exposed, so the UI can show the reasoning.
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.intelligence import CarryPair, FxCarrySection
from app.services.intelligence.features import annualized_vol, momentum, pct_change
from app.services.intelligence.history import load_many

# Professionally curated policy rate table (percent, annualized).
# Update here as central banks act; this is the one place that needs curation.
POLICY_RATES: dict[str, float] = {
    "USD": 4.50,
    "EUR": 3.00,
    "GBP": 4.75,
    "JPY": 0.50,
    "CHF": 0.25,
    "TRY": 42.50,
    "AUD": 4.35,
    "CAD": 3.75,
    "NZD": 4.25,
    "MXN": 10.50,
    "ZAR": 7.75,
    "BRL": 11.25,
    "INR": 6.50,
    "KRW": 3.25,
    "CNH": 3.10,
}


# (pair_symbol, base, quote) – base is the first currency, quote is the second.
_PAIRS: list[tuple[str, str, str]] = [
    ("USDTRY", "USD", "TRY"),
    ("EURUSD", "EUR", "USD"),
    ("GBPUSD", "GBP", "USD"),
    ("USDJPY", "USD", "JPY"),
    ("USDCHF", "USD", "CHF"),
    ("USDCAD", "USD", "CAD"),
    ("USDAUD", "USD", "AUD"),
    ("USDNZD", "USD", "NZD"),
    ("USDMXN", "USD", "MXN"),
    ("USDZAR", "USD", "ZAR"),
    ("USDBRL", "USD", "BRL"),
    ("USDINR", "USD", "INR"),
    ("USDKRW", "USD", "KRW"),
    ("USDCNH", "USD", "CNH"),
]


async def build_fx_carry() -> FxCarrySection:
    symbols = [pair for pair, _, _ in _PAIRS]
    history = await load_many(symbols, points=180)

    pairs: list[CarryPair] = []
    for pair_symbol, base, quote in _PAIRS:
        base_rate = POLICY_RATES.get(base)
        quote_rate = POLICY_RATES.get(quote)
        if base_rate is None or quote_rate is None:
            continue
        carry = base_rate - quote_rate

        series = history.get(pair_symbol)
        trend = momentum(series.closes, 60) * 100 if series and len(series.closes) > 60 else 0.0
        if series:
            rets = pct_change(series.closes)[-60:]
            vol = annualized_vol(rets) * 100
        else:
            vol = 10.0

        score = carry - 0.25 * (vol - 10.0) + 0.5 * trend

        if score > 8:
            verdict = "attractive"
        elif score < -6:
            verdict = "avoid"
        else:
            verdict = "neutral"

        rationale = (
            f"{base} faizi {base_rate:.2f}% vs {quote} {quote_rate:.2f}% · "
            f"60g trend {trend:+.2f}% · yıllık oynaklık {vol:.1f}%"
        )
        pairs.append(
            CarryPair(
                pair=pair_symbol,
                base_rate=round(base_rate, 3),
                quote_rate=round(quote_rate, 3),
                carry_pct=round(carry, 3),
                momentum_pct=round(trend, 3),
                score=round(score, 3),
                verdict=verdict,  # type: ignore[arg-type]
                rationale=rationale,
            )
        )

    pairs.sort(key=lambda p: p.score, reverse=True)
    return FxCarrySection(
        generated_at=datetime.now(UTC),
        reference_currency="USD",
        pairs=pairs,
    )
