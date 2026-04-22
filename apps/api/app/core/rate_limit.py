from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.db.redis import get_redis_client


async def enforce_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
    detail: str = 'Too many requests. Please try again later.',
) -> None:
    redis = get_redis_client()
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)

    if current > max_requests:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    client = request.client
    return client.host if client else 'unknown'


async def enforce_auth_rate_limit(request: Request, action: str) -> None:
    ip = get_client_ip(request)
    key = f'ratelimit:auth:{action}:{ip}'
    await enforce_rate_limit(
        key=key,
        max_requests=settings.AUTH_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
        detail='Too many authentication attempts. Please try again later.',
    )
