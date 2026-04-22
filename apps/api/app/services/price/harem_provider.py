from datetime import datetime, timezone
from decimal import Decimal
from typing import List
import logging

import httpx

from app.core.config import settings
from app.schemas.price import NormalizedPrice
from app.services.price.provider_base import BasePriceProvider

logger = logging.getLogger(__name__)

OUR_TO_HAREM_SYMBOL = {
    "USDTRY": "USDTRY",
    "EURUSD": "EURUSD",
    "GBPUSD": "GBPUSD",
    "USDJPY": "USDJPY",
    "USDCHF": "USDCHF",
    "USDCAD": "USDCAD",
    "USDDKK": "USDDKK",
    "USDNOK": "USDNOK",
    "USDSEK": "USDSEK",
    "USDRUB": "USDRUB",
    "AUDUSD": "AUDUSD",
    "USDSAR": "USDSAR",
    "XAU": "XAUUSD",
    "XAG": "XAGUSD",
    "XPT": "XPTUSD",
    "XPD": "XPDUSD",
    "GRAMALTIN": "ALTIN",
    "HASALTIN": "KULCEALTIN",
    "ONS": "XAUUSD",
    "CEYREKYENI": "CEYREK_YENI",
    "CEYREKESKI": "CEYREK_ESKI",
    "YARIMYENI": "YARIM_YENI",
    "YARIMESKI": "YARIM_ESKI",
    "TAMYENI": "TEK_YENI",
    "TAMESKI": "TEK_ESKI",
    "ATAYENI": "ATA_YENI",
    "ATAESKI": "ATA_ESKI",
    "ATA5YENI": "ATA5_YENI",
    "ATA5ESKI": "ATA5_ESKI",
    "GREMSEYENI": "GREMESE_YENI",
    "GREMSEESKI": "GREMESE_ESKI",
    "AYAR22": "AYAR22",
    "AYAR14": "AYAR14",
    "GUMUSTL": "GUMTRY",
    "PLATINONS": "XPTUSD",
    "PALADYUMONS": "XPDUSD",
}


class HaremProvider(BasePriceProvider):
    def __init__(self):
        super().__init__(name="harem")
        self._rate_limited_until: datetime | None = None
        self._limit_warning_logged = False

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        if not settings.HAREM_API_KEY:
            return []

        requested = [s.upper() for s in symbols if s.upper() in OUR_TO_HAREM_SYMBOL]
        if not requested:
            return []
        if self._rate_limited_until and datetime.now(timezone.utc) < self._rate_limited_until:
            if not self._limit_warning_logged:
                logger.warning(
                    "Harem quota exhausted. Skipping requests until %s",
                    self._rate_limited_until.isoformat(),
                )
                self._limit_warning_logged = True
            return []

        harem_symbols = [OUR_TO_HAREM_SYMBOL[s] for s in requested]
        params = {"symbols": ",".join(harem_symbols)}
        headers = {"X-API-Key": settings.HAREM_API_KEY}

        async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.get(f"{settings.HAREM_API_BASE_URL}/prices", params=params, headers=headers)
            if response.status_code == 429:
                reset_header = response.headers.get("x-ratelimit-reset")
                if reset_header:
                    try:
                        reset_ts = int(reset_header)
                        self._rate_limited_until = datetime.fromtimestamp(reset_ts, tz=timezone.utc)
                    except ValueError:
                        self._rate_limited_until = datetime.now(timezone.utc)
                else:
                    self._rate_limited_until = datetime.now(timezone.utc)
                self._limit_warning_logged = False
                return []
            self._rate_limited_until = None
            self._limit_warning_logged = False
            response.raise_for_status()
            payload = response.json()

        rows = payload.get("data", []) if isinstance(payload, dict) else []
        by_harem = {str(item.get("symbol", "")).upper(): item for item in rows}

        prices: List[NormalizedPrice] = []
        for our_symbol in requested:
            harem_symbol = OUR_TO_HAREM_SYMBOL.get(our_symbol)
            if not harem_symbol:
                continue
            row = by_harem.get(harem_symbol)
            if not row:
                continue

            bid = row.get("bid")
            ask = row.get("ask")
            try:
                if bid is None and ask is None:
                    continue
                if bid is None:
                    mid_price = Decimal(str(ask))
                elif ask is None:
                    mid_price = Decimal(str(bid))
                else:
                    mid_price = (Decimal(str(bid)) + Decimal(str(ask))) / Decimal("2")
            except Exception:
                continue

            asset_type = "fiat" if our_symbol.startswith("USD") or our_symbol.endswith("USD") or our_symbol in {"EURUSD", "GBPUSD", "AUDUSD"} else "metal"
            if our_symbol in {"XAU", "XAG", "XPT", "XPD", "GRAMALTIN", "HASALTIN", "ONS"}:
                asset_type = "metal"

            prices.append(
                NormalizedPrice(
                    symbol=our_symbol,
                    price=mid_price,
                    change_24h=None,
                    asset_type=asset_type,
                    last_updated_at=datetime.now(timezone.utc),
                    source=self.name,
                    is_stale=False,
                )
            )

        return prices

    async def is_healthy(self) -> bool:
        if not settings.HAREM_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=settings.PRICE_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    f"{settings.HAREM_API_BASE_URL}/prices/USDTRY",
                    headers={"X-API-Key": settings.HAREM_API_KEY},
                )
            return response.status_code == 200
        except Exception:
            return False
