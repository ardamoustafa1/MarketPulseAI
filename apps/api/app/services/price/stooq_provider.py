from decimal import Decimal
from datetime import datetime, timezone
from typing import List
import asyncio

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

STOOQ_SYMBOL_MAP = {
    "USDTRY": "usdtry",
    "EURUSD": "eurusd",
    "GBPUSD": "gbpusd",
    "USDJPY": "usdjpy",
    "USDCHF": "usdchf",
    "USDCAD": "usdcad",
    "USDAUD": "usdaud",
    "USDNZD": "usdnzd",
    "AUDUSD": "audusd",
    "NZDUSD": "nzdusd",
    "USDSEK": "usdsek",
    "USDNOK": "usdnok",
    "USDDKK": "usddkk",
    "USDCNH": "usdcnh",
    "USDRUB": "usdrub",
    "USDZAR": "usdzar",
    "USDMXN": "usdmxn",
    "USDBRL": "usdbrl",
    "USDINR": "usdinr",
    "USDKRW": "usdkrw",
    "USDHKD": "usdhkd",
    "USDSGD": "usdsgd",
    "USDPLN": "usdpln",
    "USDCZK": "usdczk",
    "USDHUF": "usdhuf",
    "USDILS": "usdils",
    "USDTHB": "usdthb",
    "USDMYR": "usdmyr",
    "USDIDR": "usdidr",
    "USDPHP": "usdphp",
    "USDVND": "usdvnd",
    "XAU": "xauusd",
    "XAG": "xagusd",
    "XPT": "xptusd",
    "XPD": "xpdusd",
}

ASSET_TYPE_MAP = {
    "XAU": "metal",
    "XAG": "metal",
    "XPT": "metal",
    "XPD": "metal",
}


class StooqProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="stooq")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        prices: List[NormalizedPrice] = []
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for symbol in symbols:
                normalized_symbol = symbol.upper()
                stooq_symbol = STOOQ_SYMBOL_MAP.get(normalized_symbol)
                if not stooq_symbol:
                    continue

                csv_line = None
                for attempt in range(settings.PRICE_PROVIDER_MAX_RETRIES + 1):
                    try:
                        response = await client.get(
                            f"https://stooq.com/q/l/?s={stooq_symbol}&f=sd2t2ohlcv&h&e=csv"
                        )
                        response.raise_for_status()
                        rows = response.text.strip().splitlines()
                        if len(rows) >= 2:
                            csv_line = rows[1]
                            break
                    except Exception:
                        if attempt >= settings.PRICE_PROVIDER_MAX_RETRIES:
                            break
                        await asyncio.sleep(
                            settings.PRICE_PROVIDER_RETRY_BACKOFF_SECONDS * (attempt + 1)
                        )

                if not csv_line:
                    continue

                parts = csv_line.split(",")
                if len(parts) < 7:
                    continue

                open_price = parts[3]
                close_price = parts[6]
                if close_price in ("", "N/D"):
                    continue

                try:
                    current_price = Decimal(close_price)
                    open_decimal = Decimal(open_price) if open_price not in ("", "N/D") else None
                except Exception:
                    continue

                change_24h = None
                if open_decimal and open_decimal != 0:
                    change_24h = ((current_price - open_decimal) / open_decimal) * Decimal("100")

                prices.append(
                    NormalizedPrice(
                        symbol=normalized_symbol,
                        price=current_price,
                        change_24h=change_24h,
                        asset_type=ASSET_TYPE_MAP.get(normalized_symbol, "fiat"),
                        last_updated_at=datetime.now(timezone.utc),
                        source=self.name,
                        is_stale=False,
                    )
                )

        return prices

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get("https://stooq.com/q/l/?s=eurusd&f=sd2t2ohlcv&h&e=csv")
            return response.status_code == 200
        except Exception:
            return False
