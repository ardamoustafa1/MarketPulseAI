from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.schemas.price import NormalizedPrice
from app.services.price.aggregator import PriceAggregator
from app.services.price.provider_base import BasePriceProvider


class FakeProvider(BasePriceProvider):
    def __init__(self, name: str, payload: list[NormalizedPrice] | None = None, should_fail: bool = False):
        super().__init__(name=name)
        self.payload = payload or []
        self.should_fail = should_fail

    async def fetch_prices(self, symbols: list[str]) -> list[NormalizedPrice]:
        if self.should_fail:
            raise RuntimeError(f"{self.name} unavailable")
        requested = {symbol.upper() for symbol in symbols}
        return [item for item in self.payload if item.symbol in requested]

    async def is_healthy(self) -> bool:
        return not self.should_fail


def _price(symbol: str, source: str, asset_type: str = "crypto") -> NormalizedPrice:
    return NormalizedPrice(
        symbol=symbol,
        price=Decimal("1"),
        change_24h=Decimal("0.1"),
        asset_type=asset_type,
        last_updated_at=datetime.now(timezone.utc),
        source=source,
        is_stale=False,
    )


@pytest.mark.asyncio
async def test_aggregator_uses_binance_for_crypto_when_available():
    binance = FakeProvider("binance", payload=[_price("BTC", "binance"), _price("ETH", "binance")])
    yahoo = FakeProvider("yahoo", payload=[_price("BTC", "yahoo"), _price("ETH", "yahoo")])
    aggregator = PriceAggregator(
        binance_provider=binance,
        exchange_rate_host_provider=FakeProvider("exchange_rate_host"),
        frankfurter_provider=FakeProvider("frankfurter"),
        gold_api_provider=FakeProvider("gold_api"),
        twelve_data_provider=FakeProvider("twelve_data"),
        stooq_provider=FakeProvider("stooq"),
        yahoo_provider=yahoo,
    )

    result = await aggregator.fetch_prices(["BTC", "ETH"])

    assert len(result) == 2
    assert all(item.source == "binance" for item in result)


@pytest.mark.asyncio
async def test_aggregator_falls_back_to_yahoo_for_missing_crypto_symbols():
    binance = FakeProvider("binance", payload=[_price("BTC", "binance")])
    yahoo = FakeProvider("yahoo", payload=[_price("SOL", "yahoo")])
    aggregator = PriceAggregator(
        binance_provider=binance,
        exchange_rate_host_provider=FakeProvider("exchange_rate_host"),
        frankfurter_provider=FakeProvider("frankfurter"),
        gold_api_provider=FakeProvider("gold_api"),
        twelve_data_provider=FakeProvider("twelve_data"),
        stooq_provider=FakeProvider("stooq"),
        yahoo_provider=yahoo,
    )

    result = await aggregator.fetch_prices(["BTC", "SOL"])

    by_symbol = {item.symbol: item for item in result}
    assert by_symbol["BTC"].source == "binance"
    assert by_symbol["SOL"].source == "yahoo"


@pytest.mark.asyncio
async def test_aggregator_uses_exchange_rate_host_for_non_crypto_symbols():
    binance = FakeProvider("binance", payload=[])
    exchange_rate_host = FakeProvider("exchange_rate_host", payload=[_price("XAU", "exchange_rate_host", asset_type="metal")])
    yahoo = FakeProvider("yahoo", payload=[_price("XAU", "yahoo", asset_type="metal")])
    aggregator = PriceAggregator(
        binance_provider=binance,
        exchange_rate_host_provider=exchange_rate_host,
        frankfurter_provider=FakeProvider("frankfurter"),
        gold_api_provider=FakeProvider("gold_api"),
        twelve_data_provider=FakeProvider("twelve_data"),
        stooq_provider=FakeProvider("stooq"),
        yahoo_provider=yahoo,
    )

    result = await aggregator.fetch_prices(["XAU"])

    assert len(result) == 1
    assert result[0].symbol == "XAU"
    assert result[0].source == "exchange_rate_host"


@pytest.mark.asyncio
async def test_aggregator_survives_provider_failures():
    binance = FakeProvider("binance", should_fail=True)
    exchange_rate_host = FakeProvider("exchange_rate_host", should_fail=True)
    frankfurter = FakeProvider("frankfurter", should_fail=True)
    gold_api = FakeProvider("gold_api", should_fail=True)
    twelve_data = FakeProvider("twelve_data", should_fail=True)
    stooq = FakeProvider("stooq", should_fail=True)
    yahoo = FakeProvider("yahoo", should_fail=True)
    aggregator = PriceAggregator(
        binance_provider=binance,
        exchange_rate_host_provider=exchange_rate_host,
        frankfurter_provider=frankfurter,
        gold_api_provider=gold_api,
        twelve_data_provider=twelve_data,
        stooq_provider=stooq,
        yahoo_provider=yahoo,
    )

    result = await aggregator.fetch_prices(["BTC", "XAU"])

    assert result == []
