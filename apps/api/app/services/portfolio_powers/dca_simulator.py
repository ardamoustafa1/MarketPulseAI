"""
Evrensel DCA (dollar-cost averaging) simulator.

Given:
  * a target symbol
  * an installment amount (in TRY/USD/EUR/BTC/XAU_GRAM)
  * cadence (weekly / biweekly / monthly)
  * start date (defaults to 3 years ago)

Compute the hypothetical portfolio trajectory by walking the historical close
series and "buying" the right amount at each tick. Returns cumulative invested,
units held, market value series, and a shareable narrative.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.portfolio_powers import (
    DcaBucketPoint,
    DcaSimulationResponse,
    Denomination,
)
from app.services.intelligence.history import load_many
from app.services.price.cache import get_all_cached_prices

TROY_OUNCE_IN_GRAMS = 31.1034768

_CADENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}


async def _currency_to_usd(amount: float, currency: Denomination) -> float:
    if currency == "USD":
        return amount
    prices = await get_all_cached_prices(["USDTRY", "EURUSD", "BTC", "XAU"])
    if currency == "TRY":
        rate = prices.get("USDTRY")
        return amount / float(rate.price) if (rate and float(rate.price) > 0) else 0.0
    if currency == "EUR":
        rate = prices.get("EURUSD")
        return amount * float(rate.price) if rate else 0.0
    if currency == "BTC":
        rate = prices.get("BTC")
        return amount * float(rate.price) if rate else 0.0
    if currency == "XAU_GRAM":
        xau = prices.get("XAU")
        if xau and float(xau.price) > 0:
            usd_per_gram = float(xau.price) / TROY_OUNCE_IN_GRAMS
            return amount * usd_per_gram
    return amount


async def run_dca_simulation(
    symbol: str,
    installment_amount: float,
    currency: Denomination = "TRY",
    cadence: str = "monthly",
    start_date: datetime | None = None,
) -> DcaSimulationResponse:
    sym = symbol.upper().strip()
    step_days = _CADENCE_DAYS.get(cadence, 30)
    end_dt = datetime.now(UTC)
    start_dt = start_date or (end_dt - timedelta(days=3 * 365))

    history = await load_many([sym], points=max(400, (end_dt - start_dt).days + 30))
    series = history.get(sym)
    if series is None or len(series.closes) < 10:
        return DcaSimulationResponse(
            symbol=sym,
            cadence=cadence,  # type: ignore[arg-type]
            installment_amount=installment_amount,
            currency=currency,
            start_date=start_dt.date().isoformat(),
            end_date=end_dt.date().isoformat(),
            total_invested=0.0,
            units_held=0.0,
            final_value=0.0,
            total_return_pct=0.0,
            series=[],
            narrative="Bu sembol için yeterli tarihsel veri yok.",
        )

    installment_usd = await _currency_to_usd(installment_amount, currency)

    start_ts = int(start_dt.timestamp())
    points = list(zip(series.timestamps, series.closes, strict=False))
    points = [(ts, close) for ts, close in points if ts >= start_ts]
    if not points:
        points = list(zip(series.timestamps[-200:], series.closes[-200:], strict=False))

    # Walk the series, buying at intervals of `step_days`
    units_held = 0.0
    total_invested_usd = 0.0
    next_buy_ts = points[0][0]
    bucket_series: list[DcaBucketPoint] = []
    for ts, close in points:
        dt = datetime.fromtimestamp(ts, tz=UTC)
        if ts >= next_buy_ts and close > 0:
            units_bought = installment_usd / close
            units_held += units_bought
            total_invested_usd += installment_usd
            next_buy_ts = ts + step_days * 86400
        if (
            len(bucket_series) == 0
            or dt.day == 1
            or dt == datetime.fromtimestamp(points[-1][0], tz=UTC)
        ):
            bucket_series.append(
                DcaBucketPoint(
                    date=dt.date().isoformat(),
                    total_invested=round(total_invested_usd, 2),
                    units_held=round(units_held, 8),
                    market_value=round(units_held * close, 2),
                )
            )

    final_close = points[-1][1]
    final_value_usd = units_held * final_close
    total_return_pct = (
        (final_value_usd / total_invested_usd - 1.0) * 100 if total_invested_usd > 0 else 0.0
    )

    narrative = (
        f"{sym} için {cadence} düzenle ≈ ${installment_usd:,.2f} yatırarak "
        f"{start_dt.date()} → {end_dt.date()} arasında "
        f"toplam ${total_invested_usd:,.0f} yatırım yapsaydın, "
        f"bugünkü değeri ≈ ${final_value_usd:,.0f} ({total_return_pct:+.1f}%)."
    )

    return DcaSimulationResponse(
        symbol=sym,
        cadence=cadence,  # type: ignore[arg-type]
        installment_amount=installment_amount,
        currency=currency,
        start_date=start_dt.date().isoformat(),
        end_date=end_dt.date().isoformat(),
        total_invested=round(total_invested_usd, 2),
        units_held=round(units_held, 8),
        final_value=round(final_value_usd, 2),
        total_return_pct=round(total_return_pct, 2),
        series=bucket_series,
        narrative=narrative,
    )
