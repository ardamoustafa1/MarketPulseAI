import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.schemas.chart import CompareResponse, CompareSeries, HistoryPoint, PriceHistoryResponse
from app.services.price.yahoo_chart import (
    fetch_close_history,
    normalize_to_index100,
    resolve_yahoo_ticker,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/history", response_model=PriceHistoryResponse)
async def get_price_history(
    symbol: str = Query(..., min_length=1, max_length=32),
    range: str = Query("1D", alias="range", description="1H,1D,1W,1M,1Y,ALL"),
):
    """Historical close prices for line charts (Yahoo Finance chart API)."""
    key = range.strip().upper()
    try:
        ts, closes, yahoo_ticker = await fetch_close_history(symbol, key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("chart history failed: %s", e)
        raise HTTPException(status_code=502, detail="Chart provider unavailable") from e

    points = [HistoryPoint(t=t, close=c) for t, c in zip(ts, closes)]
    return PriceHistoryResponse(
        symbol=symbol.strip().upper(),
        range=key,
        yahoo_ticker=yahoo_ticker,
        points=points,
    )


@router.get("/compare", response_model=CompareResponse)
async def compare_symbols(
    symbols: str = Query(..., description="Comma-separated, e.g. BTC,ETH"),
    range: str = Query("1W", alias="range"),
):
    """Two (or more) symbols on the same timeline with prices normalized to 100 at the first bar."""
    sym_list: List[str] = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(sym_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least two symbols (comma-separated).")
    if len(sym_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum five symbols for compare.")

    for s in sym_list:
        if not resolve_yahoo_ticker(s):
            raise HTTPException(status_code=400, detail=f"No chart mapping for symbol: {s}")

    key = range.strip().upper()
    series_out: list[CompareSeries] = []

    try:
        first_ts: List[int] | None = None
        raw_series: list[tuple[str, str, list[int], list[float]]] = []

        for sym in sym_list:
            ts, closes, yt = await fetch_close_history(sym, key)
            raw_series.append((sym, yt, ts, closes))

        min_len = min(len(x[2]) for x in raw_series)
        if min_len == 0:
            raise HTTPException(status_code=502, detail="Empty series from provider")

        for sym, yt, ts, closes in raw_series:
            ts2 = ts[-min_len:]
            cl2 = closes[-min_len:]
            norm = normalize_to_index100(cl2)
            points = [HistoryPoint(t=t, close=v) for t, v in zip(ts2, norm)]
            series_out.append(CompareSeries(symbol=sym, yahoo_ticker=yt, points=points))

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("compare chart failed: %s", e)
        raise HTTPException(status_code=502, detail="Chart provider unavailable") from e

    return CompareResponse(range=key, series=series_out)
