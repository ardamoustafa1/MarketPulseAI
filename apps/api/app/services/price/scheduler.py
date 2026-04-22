import asyncio
from typing import List
from app.core.config import settings
from app.services.price.provider_base import BasePriceProvider
from app.services.price.aggregator import PriceAggregator
from app.services.price.cache import cache_prices
from app.services.price.derived_instruments import build_derived_prices
import logging

logger = logging.getLogger(__name__)

class PriceFeedScheduler:
    def __init__(self, provider: BasePriceProvider, symbols: List[str], interval_seconds: int = 5):
        self.provider = provider
        self.symbols = symbols
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task = None

    async def _runner(self):
        logger.info(f"PriceFeedScheduler starting for {self.provider.name}")
        while self.is_running:
            try:
                prices = await self.provider.fetch_prices(self.symbols)
                if prices:
                    all_prices = prices + build_derived_prices(prices)
                    await cache_prices(all_prices)
            except Exception as e:
                logger.error(f"Error fetching prices from {self.provider.name}: {e}")
            
            await asyncio.sleep(self.interval_seconds)

    async def start(self):
        if self.is_running and self._task and not self._task.done():
            return
        self.is_running = True
        self._task = asyncio.create_task(self._runner())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            finally:
                self._task = None

# Global instances that will be started in main.py events
aggregated_provider = PriceAggregator()
global_price_scheduler = PriceFeedScheduler(
    provider=aggregated_provider,
    symbols=settings.PRICE_SYMBOLS,
    interval_seconds=settings.PRICE_POLL_INTERVAL_SECONDS,
)
