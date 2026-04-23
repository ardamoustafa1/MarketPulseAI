import asyncio
import logging
import uuid

from app.core.config import settings
from app.db.redis import get_redis_client
from app.services.price.aggregator import PriceAggregator
from app.services.price.cache import cache_prices
from app.services.price.derived_instruments import build_derived_prices
from app.services.price.provider_base import BasePriceProvider

logger = logging.getLogger(__name__)

class PriceFeedScheduler:
    def __init__(self, provider: BasePriceProvider, symbols: list[str], interval_seconds: int = 5):
        self.provider = provider
        self.symbols = symbols
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task = None
        self._leader_token = str(uuid.uuid4())
        self._leader_key = "locks:price_feed_scheduler"
        self._leader_ttl_seconds = max(10, self.interval_seconds * 3)

    async def _acquire_or_renew_leadership(self) -> bool:
        redis = get_redis_client()
        acquired = await redis.set(
            self._leader_key,
            self._leader_token,
            nx=True,
            ex=self._leader_ttl_seconds,
        )
        if acquired:
            return True
        current = await redis.get(self._leader_key)
        if current == self._leader_token:
            await redis.expire(self._leader_key, self._leader_ttl_seconds)
            return True
        return False

    async def _runner(self):
        logger.info(f"PriceFeedScheduler starting for {self.provider.name}")
        while self.is_running:
            try:
                is_leader = await self._acquire_or_renew_leadership()
                if not is_leader:
                    await asyncio.sleep(self.interval_seconds)
                    continue
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
