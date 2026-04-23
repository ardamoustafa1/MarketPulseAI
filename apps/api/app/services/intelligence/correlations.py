"""
Live correlation heatmap across crypto / metals / FX / stocks.

The matrix is computed from 90-day daily returns. We also surface the top-5
"surprise" pairs — correlations that have drifted the most versus the prior
90-day window — to give the user actionable concentration intelligence.
"""
from __future__ import annotations

from app.schemas.intelligence import CorrelationCell, CorrelationHighlight, CorrelationSection
from app.services.intelligence.features import pct_change, rolling_correlation
from app.services.intelligence.history import load_many

DEFAULT_CORR_SYMBOLS = [
    "BTC", "ETH", "SOL",
    "XAU", "XAG",
    "USDTRY", "EURUSD", "GBPUSD", "USDJPY",
    "GRAMALTIN",
]


async def build_correlations(
    symbols: list[str] | None = None,
    window: int = 90,
) -> CorrelationSection:
    target_symbols = symbols or DEFAULT_CORR_SYMBOLS
    history = await load_many(target_symbols, points=max(180, window * 2 + 10))

    resolved: list[str] = [s for s in target_symbols if s in history]

    returns: dict[str, list[float]] = {sym: pct_change(history[sym].closes) for sym in resolved}

    n = len(resolved)
    matrix: list[list[float]] = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    cells: list[CorrelationCell] = []
    prior_corr: dict[tuple[str, str], float] = {}

    for i, sym_a in enumerate(resolved):
        for j, sym_b in enumerate(resolved):
            if i == j:
                cells.append(CorrelationCell(row=sym_a, col=sym_b, value=1.0))
                continue
            if j < i:
                continue
            a_returns = returns[sym_a]
            b_returns = returns[sym_b]
            a_recent = a_returns[-window:]
            b_recent = b_returns[-window:]
            corr = rolling_correlation(a_recent, b_recent)
            prior_a = a_returns[-(window * 2):-window] if len(a_returns) >= window * 2 else []
            prior_b = b_returns[-(window * 2):-window] if len(b_returns) >= window * 2 else []
            prior = rolling_correlation(prior_a, prior_b) if prior_a and prior_b else 0.0
            matrix[i][j] = round(corr, 3)
            matrix[j][i] = round(corr, 3)
            cells.append(CorrelationCell(row=sym_a, col=sym_b, value=round(corr, 3)))
            cells.append(CorrelationCell(row=sym_b, col=sym_a, value=round(corr, 3)))
            prior_corr[(sym_a, sym_b)] = prior

    highlights: list[CorrelationHighlight] = []
    flat_pairs: list[tuple[tuple[str, str], float, float]] = []
    for i, sym_a in enumerate(resolved):
        for j in range(i + 1, n):
            sym_b = resolved[j]
            current = matrix[i][j]
            prior = prior_corr.get((sym_a, sym_b), 0.0)
            delta = current - prior
            flat_pairs.append(((sym_a, sym_b), current, delta))

    # Surface the 5 largest absolute drifts.
    flat_pairs.sort(key=lambda item: abs(item[2]), reverse=True)
    for (sym_a, sym_b), current, delta in flat_pairs[:5]:
        if abs(delta) < 0.2:
            continue
        direction = "arttı" if delta > 0 else "azaldı"
        message = (
            f"{sym_a}–{sym_b} korelasyonu {current:+.2f}; son 90 güne göre {direction} "
            f"({delta:+.2f})."
        )
        highlights.append(
            CorrelationHighlight(
                pair=(sym_a, sym_b),
                value=round(current, 3),
                delta_vs_90d_prior=round(delta, 3),
                message=message,
            )
        )

    return CorrelationSection(
        window_days=window,
        symbols=resolved,
        matrix=matrix,
        cells=cells,
        highlights=highlights,
    )
