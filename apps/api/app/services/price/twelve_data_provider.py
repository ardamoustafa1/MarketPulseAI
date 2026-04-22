from datetime import datetime, timezone
from decimal import Decimal
from typing import List
import logging

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

METAL_SYMBOLS = {"XAU", "XAG", "XPT", "XPD"}
logger = logging.getLogger(__name__)


def _to_twelve_symbol(symbol: str) -> tuple[str, str] | None:
    if symbol in METAL_SYMBOLS:
        return f"{symbol}/USD", "metal"
    if len(symbol) == 6 and symbol.isalpha():
        return f"{symbol[:3]}/{symbol[3:]}", "fiat"
    return None


class TwelveDataProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="twelve_data")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        if not settings.TWELVE_DATA_API_KEY:
            return []

        prices: List[NormalizedPrice] = []
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for symbol in symbols:
                normalized_symbol = symbol.upper()
                mapped = _to_twelve_symbol(normalized_symbol)
                if mapped is None:
                    continue
                td_symbol, asset_type = mapped

                try:
                    response = await client.get(
                        f"{settings.TWELVE_DATA_BASE_URL}/price",
                        params={
                            "symbol": td_symbol,
                            "apikey": settings.TWELVE_DATA_API_KEY,
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                    if payload.get("status") == "error":
                        continue
                    price_value = payload.get("price")
                    if price_value is None:
                        continue
                    price = Decimal(str(price_value))
                except Exception as exc:
                    logger.warning("twelve_data fetch failed for %s: %s", normalized_symbol, exc)
                    continue

                prices.append(
                    NormalizedPrice(
                        symbol=normalized_symbol,
                        price=price,
                        change_24h=None,
                        asset_type=asset_type,
                        last_updated_at=datetime.now(timezone.utc),
                        source=self.name,
                        is_stale=False,
                    )
                )

        return prices

    async def is_healthy(self) -> bool:
        if not settings.TWELVE_DATA_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    f"{settings.TWELVE_DATA_BASE_URL}/price",
                    params={"symbol": "EUR/USD", "apikey": settings.TWELVE_DATA_API_KEY},
                )
            return response.status_code == 200
        except Exception:
            return False
