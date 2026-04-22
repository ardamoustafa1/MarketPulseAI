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


def _split_symbol(symbol: str) -> tuple[str, str, str] | None:
    if symbol in METAL_SYMBOLS:
        return symbol, "USD", "metal"
    if len(symbol) == 6 and symbol.isalpha():
        return symbol[:3], symbol[3:], "fiat"
    return None


class AlphaVantageProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="alpha_vantage")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        if not settings.ALPHA_VANTAGE_API_KEY:
            return []

        prices: List[NormalizedPrice] = []
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for symbol in symbols:
                normalized = symbol.upper()
                mapped = _split_symbol(normalized)
                if mapped is None:
                    continue
                from_currency, to_currency, asset_type = mapped

                try:
                    response = await client.get(
                        settings.ALPHA_VANTAGE_BASE_URL,
                        params={
                            "function": "CURRENCY_EXCHANGE_RATE",
                            "from_currency": from_currency,
                            "to_currency": to_currency,
                            "apikey": settings.ALPHA_VANTAGE_API_KEY,
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                    if "Note" in payload or "Information" in payload:
                        continue
                    rate = (
                        payload.get("Realtime Currency Exchange Rate", {})
                        .get("5. Exchange Rate")
                    )
                    if rate is None:
                        continue
                    price = Decimal(str(rate))
                except Exception as exc:
                    logger.warning("alpha_vantage fetch failed for %s: %s", normalized, exc)
                    continue

                prices.append(
                    NormalizedPrice(
                        symbol=normalized,
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
        if not settings.ALPHA_VANTAGE_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    settings.ALPHA_VANTAGE_BASE_URL,
                    params={
                        "function": "CURRENCY_EXCHANGE_RATE",
                        "from_currency": "USD",
                        "to_currency": "TRY",
                        "apikey": settings.ALPHA_VANTAGE_API_KEY,
                    },
                )
            return response.status_code == 200
        except Exception:
            return False
