from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, List
import asyncio

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

BINANCE_SYMBOL_MAP = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "SOL": "SOLUSDT",
    "ADA": "ADAUSDT",
    "XRP": "XRPUSDT",
    "BNB": "BNBUSDT",
    "DOGE": "DOGEUSDT",
    "TRX": "TRXUSDT",
    "DOT": "DOTUSDT",
    "MATIC": "MATICUSDT",
    "AVAX": "AVAXUSDT",
    "LINK": "LINKUSDT",
    "LTC": "LTCUSDT",
    "BCH": "BCHUSDT",
    "ATOM": "ATOMUSDT",
    "ETC": "ETCUSDT",
    "XLM": "XLMUSDT",
    "XMR": "XMRUSDT",
    "FIL": "FILUSDT",
    "APT": "APTUSDT",
    "ARB": "ARBUSDT",
    "OP": "OPUSDT",
    "HBAR": "HBARUSDT",
    "VET": "VETUSDT",
    "NEAR": "NEARUSDT",
    "ALGO": "ALGOUSDT",
    "ICP": "ICPUSDT",
    "AAVE": "AAVEUSDT",
    "SAND": "SANDUSDT",
    "MANA": "MANAUSDT",
}


class BinanceProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="binance")

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        wanted: Dict[str, str] = {}
        for symbol in symbols:
            normalized_symbol = symbol.upper()
            binance_symbol = BINANCE_SYMBOL_MAP.get(normalized_symbol)
            if binance_symbol:
                wanted[normalized_symbol] = binance_symbol
        if not wanted:
            return []

        payload = None
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for attempt in range(settings.PRICE_PROVIDER_MAX_RETRIES + 1):
                try:
                    response = await client.get("https://api.binance.com/api/v3/ticker/24hr")
                    response.raise_for_status()
                    payload = response.json()
                    break
                except Exception:
                    if attempt >= settings.PRICE_PROVIDER_MAX_RETRIES:
                        break
                    await asyncio.sleep(
                        settings.PRICE_PROVIDER_RETRY_BACKOFF_SECONDS * (attempt + 1)
                    )

        if not isinstance(payload, list):
            return []

        rows_by_symbol = {
            str(item.get("symbol", "")).upper(): item
            for item in payload
            if isinstance(item, dict)
        }

        prices: List[NormalizedPrice] = []
        now = datetime.now(timezone.utc)
        for normalized_symbol, binance_symbol in wanted.items():
            data = rows_by_symbol.get(binance_symbol)
            if not data:
                continue
            try:
                last_price = Decimal(str(data["lastPrice"]))
                change_24h = Decimal(str(data["priceChangePercent"]))
            except Exception:
                continue
            prices.append(
                NormalizedPrice(
                    symbol=normalized_symbol,
                    price=last_price,
                    change_24h=change_24h,
                    asset_type="crypto",
                    last_updated_at=now,
                    source=self.name,
                    is_stale=False,
                )
            )
        return prices

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    "https://api.binance.com/api/v3/ping",
                )
            return response.status_code == 200
        except Exception:
            return False
