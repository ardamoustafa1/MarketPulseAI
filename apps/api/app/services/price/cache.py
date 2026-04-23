import json
from datetime import UTC, datetime

from app.core.config import settings
from app.db.redis import get_redis_client
from app.schemas.price import NormalizedPrice

PRICE_CACHE_PREFIX = "marketpulse:price:"
STALE_THRESHOLD_SECONDS = settings.PRICE_STALE_THRESHOLD_SECONDS
CACHE_TTL_SECONDS = settings.PRICE_CACHE_TTL_SECONDS

async def cache_prices(prices: list[NormalizedPrice]):
    """Save normalized prices to Redis and prepare for WS broadcast."""
    redis = get_redis_client()
    for p in prices:
        cache_key = f"{PRICE_CACHE_PREFIX}{p.symbol}"
        # Serialize datetime format to iso 
        data = p.model_dump(mode="json")
        data["last_updated_at"] = p.last_updated_at.isoformat()
        
        await redis.set(cache_key, json.dumps(data), ex=CACHE_TTL_SECONDS)
        
        # Publish to simple redis channel for WebSockets to pick up later
        await redis.publish("channel:price_updates", json.dumps(data))

async def get_cached_price(symbol: str) -> NormalizedPrice | None:
    redis = get_redis_client()
    cache_key = f"{PRICE_CACHE_PREFIX}{symbol}"
    raw = await redis.get(cache_key)
    if not raw:
        return None
    
    data = json.loads(raw)
    updated_at = datetime.fromisoformat(data["last_updated_at"])
    
    # Check if stale
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=UTC)
    age_seconds = (datetime.now(UTC) - updated_at).total_seconds()
    is_stale = age_seconds > STALE_THRESHOLD_SECONDS
    
    data["is_stale"] = is_stale
    return NormalizedPrice(**data)

async def get_all_cached_prices(symbols: list[str]) -> dict[str, NormalizedPrice]:
    result = {}
    for sym in symbols:
        price = await get_cached_price(sym)
        if price:
            result[sym] = price
    return result
