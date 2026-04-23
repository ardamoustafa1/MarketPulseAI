import logging
from datetime import UTC, datetime
from decimal import Decimal

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

METAL_SYMBOLS = {"XAU", "XAG", "XPT", "XPD"}
logger = logging.getLogger(__name__)


class GoldApiProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="gold_api")

    async def fetch_prices(self, symbols: list[str]) -> list[NormalizedPrice]:
        requested = [s.upper() for s in symbols if s.upper() in METAL_SYMBOLS]
        if not requested:
            return []

        prices: list[NormalizedPrice] = []
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for symbol in requested:
                try:
                    response = await client.get(f"{settings.GOLD_API_BASE_URL}/{symbol}")
                    response.raise_for_status()
                    payload = response.json()
                    price_value = payload.get("price")
                    if price_value is None:
                        continue
                    price = Decimal(str(price_value))
                except Exception as exc:
                    logger.warning("gold_api fetch failed for %s: %s", symbol, exc)
                    continue

                prices.append(
                    NormalizedPrice(
                        symbol=symbol,
                        price=price,
                        change_24h=None,
                        asset_type="metal",
                        last_updated_at=datetime.now(UTC),
                        source=self.name,
                        is_stale=False,
                    )
                )
        return prices

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(f"{settings.GOLD_API_BASE_URL}/XAU")
            return response.status_code == 200
        except Exception:
            return False
