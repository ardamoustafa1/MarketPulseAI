import logging
from collections import defaultdict

from app.schemas.price import NormalizedPrice
from app.services.price.alpha_vantage_provider import AlphaVantageProvider
from app.services.price.binance_provider import BinanceProvider
from app.services.price.exchange_rate_host_provider import ExchangeRateHostProvider
from app.services.price.frankfurter_provider import FrankfurterProvider
from app.services.price.gold_api_provider import GoldApiProvider
from app.services.price.provider_base import BasePriceProvider
from app.services.price.stooq_provider import StooqProvider
from app.services.price.twelve_data_provider import TwelveDataProvider
from app.services.price.yahoo_provider import YahooProvider

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
        exchange_rate_host_provider: BasePriceProvider | None = None,
        frankfurter_provider: BasePriceProvider | None = None,
        gold_api_provider: BasePriceProvider | None = None,
        twelve_data_provider: BasePriceProvider | None = None,
        alpha_vantage_provider: BasePriceProvider | None = None,
        stooq_provider: BasePriceProvider | None = None,
        yahoo_provider: BasePriceProvider | None = None,
    ):
        super().__init__(name="aggregated_feed")
        self.binance_provider = binance_provider or BinanceProvider()
        self.exchange_rate_host_provider = exchange_rate_host_provider or ExchangeRateHostProvider()
        self.frankfurter_provider = frankfurter_provider or FrankfurterProvider()
        self.gold_api_provider = gold_api_provider or GoldApiProvider()
        self.twelve_data_provider = twelve_data_provider or TwelveDataProvider()
        self.alpha_vantage_provider = alpha_vantage_provider or AlphaVantageProvider()
        self.stooq_provider = stooq_provider or StooqProvider()
        self.yahoo_provider = yahoo_provider or YahooProvider()

    async def fetch_prices(self, symbols: list[str]) -> list[NormalizedPrice]:
        symbols_by_type = defaultdict(list)
        for symbol in symbols:
            normalized = symbol.upper()
            if normalized in CRYPTO_SYMBOLS:
                symbols_by_type["crypto"].append(normalized)
            else:
                symbols_by_type["non_crypto"].append(normalized)

        results: dict[str, NormalizedPrice] = {}

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
                fx_metal_prices = await self.exchange_rate_host_provider.fetch_prices(symbols_by_type["non_crypto"])
                for price in fx_metal_prices:
                    results[price.symbol] = price
            except Exception as exc:
                logger.warning("ExchangeRate.host provider failed for non-crypto symbols: %s", exc)

            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]

            if missing_non_crypto:
                try:
                    frankfurter_prices = await self.frankfurter_provider.fetch_prices(missing_non_crypto)
                    for price in frankfurter_prices:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Frankfurter provider failed for non-crypto symbols: %s", exc)

            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]

            if missing_non_crypto:
                try:
                    gold_api_prices = await self.gold_api_provider.fetch_prices(missing_non_crypto)
                    for price in gold_api_prices:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Gold API provider failed for non-crypto symbols: %s", exc)

            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]

            if missing_non_crypto:
                try:
                    twelve_data_prices = await self.twelve_data_provider.fetch_prices(missing_non_crypto)
                    for price in twelve_data_prices:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Twelve Data provider failed for non-crypto symbols: %s", exc)

            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]

            if missing_non_crypto:
                try:
                    alpha_vantage_prices = await self.alpha_vantage_provider.fetch_prices(missing_non_crypto)
                    for price in alpha_vantage_prices:
                        results[price.symbol] = price
                except Exception as exc:
                    logger.warning("Alpha Vantage provider failed for non-crypto symbols: %s", exc)

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

            # Stooq remains the final fallback to reduce missing symbols under external
            # throttling (e.g. Yahoo 429 or provider plan limits).
            missing_non_crypto = [
                symbol for symbol in symbols_by_type["non_crypto"] if symbol not in results
            ]
            stooq_candidates = missing_non_crypto
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
        exchange_rate_host_health = await self.exchange_rate_host_provider.is_healthy()
        frankfurter_health = await self.frankfurter_provider.is_healthy()
        gold_api_health = await self.gold_api_provider.is_healthy()
        twelve_data_health = await self.twelve_data_provider.is_healthy()
        alpha_vantage_health = await self.alpha_vantage_provider.is_healthy()
        stooq_health = await self.stooq_provider.is_healthy()
        yahoo_health = await self.yahoo_provider.is_healthy()
        return (
            binance_health
            or exchange_rate_host_health
            or frankfurter_health
            or gold_api_health
            or twelve_data_health
            or alpha_vantage_health
            or stooq_health
            or yahoo_health
        )
