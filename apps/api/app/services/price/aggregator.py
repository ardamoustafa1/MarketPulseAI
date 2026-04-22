import logging
from collections import defaultdict
from typing import Dict, List

from app.schemas.price import NormalizedPrice
from app.services.price.binance_provider import BinanceProvider
from app.services.price.harem_provider import HaremProvider
from app.services.price.provider_base import BasePriceProvider
from app.services.price.stooq_provider import StooqProvider
from app.services.price.yahoo_provider import YahooProvider, YAHOO_SYMBOL_MAP

logger = logging.getLogger(__name__)

CRYPTO_SYMBOLS = {
    "BTC", "ETH", "SOL", "ADA", "XRP", "BNB", "DOGE", "TRX", "DOT", "MATIC",
    "AVAX", "LINK", "LTC", "BCH", "ATOM", "ETC", "XLM", "XMR", "FIL", "APT",
    "ARB", "OP", "HBAR", "VET", "NEAR", "ALGO", "ICP", "AAVE", "SAND", "MANA",
}


class PriceAggregator(BasePriceProvider):
    def __init__(
        self,
        binance_provider: BasePriceProvider | None = None,
        harem_provider: BasePriceProvider | None = None,
        stooq_provider: BasePriceProvider | None = None,
        yahoo_provider: BasePriceProvider | None = None,
    ):
        super().__init__(name="aggregated_feed")
        self.binance_provider = binance_provider or BinanceProvider()
        self.harem_provider = harem_provider or HaremProvider()
        self.stooq_provider = stooq_provider or StooqProvider()
        self.yahoo_provider = yahoo_provider or YahooProvider()

    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        symbols_by_type = defaultdict(list)
        for symbol in symbols:
            normalized = symbol.upper()
            if normalized in CRYPTO_SYMBOLS:
                symbols_by_type["crypto"].append(normalized)
            else:
                symbols_by_type["non_crypto"].append(normalized)

        results: Dict[str, NormalizedPrice] = {}

        if symbols_by_type["crypto"]:
            try:
                crypto_prices = await self.binance_provider.fetch_prices(symbols_by_type["crypto"])
                for price in crypto_prices:
                    results[price.symbol] = price
            except Exception as exc:
                logger.warning("Binance provider failed for crypto symbols: %s", exc)

            missing_crypto = [symbol for symbol in symbols_by_type["crypto"] if symbol not in results]
            if missing_crypto:
                try:
                    fallback_crypto = await self.yahoo_provider.fetch_prices(missing_crypto)
                    for price in fallback_crypto:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Yahoo fallback failed for crypto symbols: %s", exc)

        if symbols_by_type["non_crypto"]:
            try:
                harem_prices = await self.harem_provider.fetch_prices(symbols_by_type["non_crypto"])
                for price in harem_prices:
                    results[price.symbol] = price
            except Exception as exc:
                logger.warning("Harem provider failed for non-crypto symbols: %s", exc)

            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]

            if missing_non_crypto:
                try:
                    fallback_non_crypto = await self.yahoo_provider.fetch_prices(missing_non_crypto)
                    for price in fallback_non_crypto:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Yahoo fallback failed for non-crypto symbols: %s", exc)

            # Stooq is used as a tertiary source only for symbols Yahoo does not support.
            # This avoids overriding expected Yahoo coverage and keeps behavior deterministic.
            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]
            stooq_candidates = [symbol for symbol in missing_non_crypto if symbol not in YAHOO_SYMBOL_MAP]
            if stooq_candidates:
                try:
                    non_crypto_prices = await self.stooq_provider.fetch_prices(stooq_candidates)
                    for price in non_crypto_prices:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Stooq provider failed for non-crypto symbols: %s", exc)

        return [results[symbol.upper()] for symbol in symbols if symbol.upper() in results]

    async def is_healthy(self) -> bool:
        binance_health = await self.binance_provider.is_healthy()
        harem_health = await self.harem_provider.is_healthy()
        stooq_health = await self.stooq_provider.is_healthy()
        yahoo_health = await self.yahoo_provider.is_healthy()
        return binance_health or harem_health or stooq_health or yahoo_health
