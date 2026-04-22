from datetime import datetime, timezone
from decimal import Decimal
from typing import List

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

METAL_SYMBOLS = {"XAU", "XAG", "XPT", "XPD"}


class GoldApiProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="gold_api")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        requested = [s.upper() for s in symbols if s.upper() in METAL_SYMBOLS]
        if not requested:
            return []

        prices: List[NormalizedPrice] = []
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
                except Exception:
                    continue

                prices.append(
                    NormalizedPrice(
                        symbol=symbol,
                        price=price,
                        change_24h=None,
                        asset_type="metal",
                        last_updated_at=datetime.now(timezone.utc),
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
