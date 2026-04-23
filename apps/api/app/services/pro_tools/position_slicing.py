"""
Position slicing calculator (DCA-like planner).

Given a total budget, currency, and cadence, forecasts:

  * each slice's scheduled date
  * projected price path (using recent drift + low-pass filter)
  * expected average cost
  * expected unit accumulation

Outputs a shareable narrative the mobile app can render inside the pro-tools
flow without ever running this math on-device.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from app.schemas.pro_tools import SlicingPlanView, SlicingSlice
from app.services.intelligence.history import load_close_series


def _project_prices(closes: list[float], steps: int) -> list[float]:
    if not closes or steps <= 0:
        return []
    if len(closes) < 10:
        return [closes[-1]] * steps
    base = closes[-1]
    recent = closes[-30:]
    drift = 0.0
    if len(recent) >= 2 and recent[0] > 0:
        drift = ((recent[-1] / recent[0]) - 1.0) / len(recent)
    daily_drift = max(min(drift, 0.005), -0.005)
    projections: list[float] = []
    for i in range(1, steps + 1):
        projections.append(base * (1 + daily_drift * i))
    return projections


async def build_position_slicing(
    symbol: str,
    total_budget: float,
    currency: Literal["TRY", "USD", "EUR"] = "TRY",
    slice_count: int = 4,
    cadence_days: int = 7,
) -> SlicingPlanView:
    sym = symbol.upper().strip()
    slice_count = max(2, min(slice_count, 24))
    cadence_days = max(1, min(cadence_days, 90))
    allocation = round(total_budget / slice_count, 4)

    series = await load_close_series(sym, points=180)
    step_days = cadence_days
    projections = _project_prices(series.closes, slice_count * step_days)

    start = datetime.now(UTC)
    slices: list[SlicingSlice] = []
    units_cum = 0.0
    prices_used: list[float] = []
    for idx in range(slice_count):
        scheduled = start + timedelta(days=idx * step_days)
        price_idx = min(idx * step_days, len(projections) - 1) if projections else 0
        projected = projections[price_idx] if projections else series.closes[-1]
        units = allocation / projected if projected > 0 else 0.0
        units_cum += units
        prices_used.append(projected)
        slices.append(
            SlicingSlice(
                index=idx + 1,
                scheduled_at=scheduled.date().isoformat(),
                allocation=allocation,
                projected_price=round(projected, 6),
                cumulative_units=round(units_cum, 8),
            )
        )

    expected_units = sum(s.allocation / s.projected_price for s in slices if s.projected_price > 0)
    expected_cost = sum(s.allocation for s in slices)
    expected_avg = expected_cost / expected_units if expected_units > 0 else 0.0
    narrative = (
        f"{sym} için {total_budget:,.2f} {currency} pozisyonunu {slice_count} dilimde "
        f"({cadence_days} günde bir {allocation:,.2f} {currency}) yayarsan "
        f"beklenen ortalama alım {expected_avg:.4f} {currency} olur."
    )

    return SlicingPlanView(
        symbol=sym,
        total_budget=round(total_budget, 4),
        currency=currency,
        slice_count=slice_count,
        cadence_days=cadence_days,
        start_date=start.date().isoformat(),
        end_date=(start + timedelta(days=(slice_count - 1) * step_days)).date().isoformat(),
        slices=slices,
        expected_avg_price=round(expected_avg, 6),
        expected_units=round(expected_units, 8),
        expected_cost=round(expected_cost, 2),
        narrative=narrative,
    )
