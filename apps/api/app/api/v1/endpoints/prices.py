import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query

from app.schemas.price import NormalizedPrice
from app.services.price.cache import cache_prices, get_all_cached_prices, get_cached_price
from app.services.price.derived_instruments import build_derived_prices
from app.services.price.scheduler import aggregated_provider

router = APIRouter()
logger = logging.getLogger(__name__)
ON_DEMAND_REFRESH_MAX_SYMBOLS = 8
ON_DEMAND_REFRESH_TIMEOUT_SECONDS = 8.0

# Symbols produced by build_derived_prices. Requesting any of these on-demand
# must also trigger a refresh of their base feeds (XAU/XAG/XPT/XPD + USDTRY/
# EURUSD), otherwise aggregated_provider has nothing to derive from.
_DERIVED_METAL_SYMBOLS = {
    "ONS", "USDKG", "EURKG", "GRAMALTIN", "HASALTIN", "AYAR22", "AYAR14",
    "CEYREKYENI", "CEYREKESKI", "YARIMYENI", "YARIMESKI", "TAMYENI", "TAMESKI",
    "ATAYENI", "ATAESKI", "ATA5YENI", "ATA5ESKI", "GREMSEYENI", "GREMSEESKI",
    "GUMUSTL", "GUMUSONS", "GUMUSUSD", "ALTINGUMUS",
    "PLATINONS", "PLATINUSD", "PALADYUMONS", "PALADYUMUSD",
}
_DERIVED_METAL_BASES = ("XAU", "XAG", "XPT", "XPD", "USDTRY", "EURUSD")

@router.get("", response_model=list[NormalizedPrice])
@router.get("/", response_model=list[NormalizedPrice])
async def get_prices(
    symbols: str = Query(..., description="Comma separated symbols, e.g. BTC,ETH,XAU"),
    only_fresh: bool = Query(False, description="When true, stale prices are excluded from the response."),
):
    """
    Get current market prices for requested symbols.
    Prices are served from Redis cache.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    prices_dict = await get_all_cached_prices(symbol_list)

    stale_symbols = [symbol for symbol, price in prices_dict.items() if price.is_stale]
    missing_symbols = [symbol for symbol in symbol_list if symbol not in prices_dict]
    refresh_candidates = [*missing_symbols, *stale_symbols]

    # If any requested/stale symbol is a derived metal, ensure the upstream
    # base feeds are refreshed too so build_derived_prices has real inputs.
    if any(sym in _DERIVED_METAL_SYMBOLS for sym in refresh_candidates):
        refresh_candidates.extend(_DERIVED_METAL_BASES)

    symbols_to_refresh = list(dict.fromkeys(refresh_candidates))[:ON_DEMAND_REFRESH_MAX_SYMBOLS]

    if symbols_to_refresh:
        try:
            fetched = await asyncio.wait_for(
                aggregated_provider.fetch_prices(symbols_to_refresh),
                timeout=ON_DEMAND_REFRESH_TIMEOUT_SECONDS,
            )
            if fetched:
                # Keep derived instruments available when their base symbols were fetched.
                enriched = fetched + build_derived_prices(fetched)
                await cache_prices(enriched)
                refreshed_prices = await get_all_cached_prices(symbol_list)
                prices_dict.update(refreshed_prices)
        except TimeoutError:
            logger.warning("On-demand price refresh timed out for symbols: %s", ",".join(symbols_to_refresh))
        except Exception as exc:
            logger.warning("On-demand price refresh failed for symbols %s: %s", ",".join(symbols_to_refresh), exc)

    prices = list(prices_dict.values())
    if only_fresh:
        prices = [price for price in prices if not price.is_stale]

    return prices

@router.get("/{symbol}", response_model=NormalizedPrice)
async def get_price(symbol: str, only_fresh: bool = Query(False, description="When true, stale prices return 404")):
    """Get single asset price"""
    price = await get_cached_price(symbol.upper())
    if not price or (only_fresh and price.is_stale):
        raise HTTPException(status_code=404, detail=f"Price for {symbol} not found in active feed")
    return price

