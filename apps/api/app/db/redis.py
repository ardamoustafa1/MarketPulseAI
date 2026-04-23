import redis.asyncio as redis

from app.core.config import settings

# Create a global Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, 
    decode_responses=True # Returns string instead of bytes
)

def get_redis_client() -> redis.Redis:
    return redis.Redis(connection_pool=redis_pool)
