from datetime import datetime, timezone
from decimal import Decimal
from typing import List

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider


def _split_fx_symbol(symbol: str) -> tuple[str, str] | None:
    if len(symbol) != 6:
        return None
    base = symbol[:3]
    quote = symbol[3:]
    if not (base.isalpha() and quote.isalpha()):
        return None
    return base, quote


class FrankfurterProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="frankfurter")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        prices: List[NormalizedPrice] = []
        async with httpx.AsyncClient(
            timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS, follow_redirects=True
        ) as client:
            for symbol in symbols:
                normalized_symbol = symbol.upper()
                pair = _split_fx_symbol(normalized_symbol)
                if pair is None:
                    continue
                base, quote = pair
                if base.startswith("X") or quote.startswith("X"):
                    continue

                try:
                    response = await client.get(
                        f"{settings.FRANKFURTER_BASE_URL}/latest",
                        params={"from": base, "to": quote},
                    )
                    response.raise_for_status()
                    payload = response.json()
                    rate_value = payload.get("rates", {}).get(quote)
                    if rate_value is None:
                        continue
                    price = Decimal(str(rate_value))
                except Exception:
                    continue

                prices.append(
                    NormalizedPrice(
                        symbol=normalized_symbol,
                        price=price,
                        change_24h=None,
                        asset_type="fiat",
                        last_updated_at=datetime.now(timezone.utc),
                        source=self.name,
                        is_stale=False,
                    )
                )

        return prices

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(
                timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                response = await client.get(
                    f"{settings.FRANKFURTER_BASE_URL}/latest",
                    params={"from": "USD", "to": "TRY"},
                )
            return response.status_code == 200
        except Exception:
            return False
