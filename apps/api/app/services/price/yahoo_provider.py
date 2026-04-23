import asyncio
from datetime import UTC, datetime
from decimal import Decimal

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

FX_YAHOO_SYMBOL_MAP = {
    "USDTRY": "TRY=X",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
    "USDCHF": "CHF=X",
    "USDCAD": "CAD=X",
    "USDAUD": "AUD=X",
    "USDNZD": "NZD=X",
    "USDSEK": "SEK=X",
    "USDNOK": "NOK=X",
    "USDDKK": "DKK=X",
    "USDCNH": "CNH=X",
    "USDRUB": "RUB=X",
    "USDZAR": "ZAR=X",
    "USDMXN": "MXN=X",
    "USDBRL": "BRL=X",
    "USDINR": "INR=X",
    "USDKRW": "KRW=X",
    "USDHKD": "HKD=X",
    "USDSGD": "SGD=X",
    "USDPLN": "PLN=X",
    "USDCZK": "CZK=X",
    "USDHUF": "HUF=X",
    "USDILS": "ILS=X",
    "USDAED": "AED=X",
    "USDSAR": "SAR=X",
    "USDQAR": "QAR=X",
    "USDKWD": "KWD=X",
    "USDBHD": "BHD=X",
    "USDOMR": "OMR=X",
    "USDTHB": "THB=X",
    "USDMYR": "MYR=X",
    "USDIDR": "IDR=X",
    "USDPHP": "PHP=X",
    "USDVND": "VND=X",
}

YAHOO_SYMBOL_MAP = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD",
    "ADA": "ADA-USD",
    "XRP": "XRP-USD",
    "BNB": "BNB-USD",
    "DOGE": "DOGE-USD",
    "TRX": "TRX-USD",
    "DOT": "DOT-USD",
    "MATIC": "MATIC-USD",
    "AVAX": "AVAX-USD",
    "LINK": "LINK-USD",
    "LTC": "LTC-USD",
    "BCH": "BCH-USD",
    "ATOM": "ATOM-USD",
    "ETC": "ETC-USD",
    "XLM": "XLM-USD",
    "XMR": "XMR-USD",
    "FIL": "FIL-USD",
    "APT": "APT-USD",
    "ARB": "ARB-USD",
    "OP": "OP-USD",
    "HBAR": "HBAR-USD",
    "VET": "VET-USD",
    "NEAR": "NEAR-USD",
    "ALGO": "ALGO-USD",
    "ICP": "ICP-USD",
    "AAVE": "AAVE-USD",
    "SAND": "SAND-USD",
    "MANA": "MANA-USD",
    "XAU": "XAUUSD=X",
    "XAG": "XAGUSD=X",
    "XPT": "XPTUSD=X",
    "XPD": "XPDUSD=X",
    **FX_YAHOO_SYMBOL_MAP,
}

ASSET_TYPE_MAP = {
    "BTC": "crypto",
    "ETH": "crypto",
    "SOL": "crypto",
    "ADA": "crypto",
    "XRP": "crypto",
    "BNB": "crypto",
    "DOGE": "crypto",
    "TRX": "crypto",
    "DOT": "crypto",
    "MATIC": "crypto",
    "AVAX": "crypto",
    "LINK": "crypto",
    "LTC": "crypto",
    "BCH": "crypto",
    "ATOM": "crypto",
    "ETC": "crypto",
    "XLM": "crypto",
    "XMR": "crypto",
    "FIL": "crypto",
    "APT": "crypto",
    "ARB": "crypto",
    "OP": "crypto",
    "HBAR": "crypto",
    "VET": "crypto",
    "NEAR": "crypto",
    "ALGO": "crypto",
    "ICP": "crypto",
    "AAVE": "crypto",
    "SAND": "crypto",
    "MANA": "crypto",
    "XAU": "metal",
    "XAG": "metal",
    "XPT": "metal",
    "XPD": "metal",
}


class YahooProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="yahoo")

    async def fetch_prices(self, symbols: list[str]) -> list[NormalizedPrice]:
        prices: list[NormalizedPrice] = []
        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            for symbol in symbols:
                normalized_symbol = symbol.upper()
                yahoo_symbol = YAHOO_SYMBOL_MAP.get(normalized_symbol)
                if not yahoo_symbol:
                    continue
                payload = None
                for attempt in range(settings.PRICE_PROVIDER_MAX_RETRIES + 1):
                    try:
                        response = await client.get(
                            f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}",
                            params={"interval": "1m", "range": "1d"},
                        )
                        response.raise_for_status()
                        payload = response.json()
                        break
                    except Exception:
                        if attempt >= settings.PRICE_PROVIDER_MAX_RETRIES:
                            break
                        await asyncio.sleep(
                            settings.PRICE_PROVIDER_RETRY_BACKOFF_SECONDS * (attempt + 1)
                        )
                if not payload:
                    continue
                result = payload.get("chart", {}).get("result", [])
                if not result:
                    continue

                meta = result[0].get("meta", {})
                current_price = meta.get("regularMarketPrice")
                previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")

                if current_price is None:
                    continue

                current_price_decimal = Decimal(str(current_price))
                change_24h = None
                if previous_close not in (None, 0):
                    previous_close_decimal = Decimal(str(previous_close))
                    change_24h = (
                        (current_price_decimal - previous_close_decimal)
                        / previous_close_decimal
                    ) * Decimal("100")

                prices.append(
                    NormalizedPrice(
                        symbol=normalized_symbol,
                        price=current_price_decimal,
                        change_24h=change_24h,
                            asset_type=ASSET_TYPE_MAP.get(normalized_symbol, "fiat"),
                        last_updated_at=datetime.now(UTC),
                        source=self.name,
                        is_stale=False,
                    )
                )
        return prices

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD",
                    params={"interval": "1m", "range": "1d"},
                )
            return response.status_code == 200
        except Exception:
            return False
