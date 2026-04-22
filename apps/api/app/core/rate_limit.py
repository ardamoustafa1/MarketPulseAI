from fastapi import HTTPException, Request, status
import ipaddress
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
    peer_ip = request.client.host if request.client else 'unknown'
    peer_trusted = False
    if settings.TRUSTED_PROXY_CIDRS:
        try:
            peer_obj = ipaddress.ip_address(peer_ip)
            peer_trusted = any(peer_obj in ipaddress.ip_network(cidr, strict=False) for cidr in settings.TRUSTED_PROXY_CIDRS)
        except ValueError:
            peer_trusted = False
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get('x-forwarded-for')
        if forwarded and (not settings.TRUSTED_PROXY_CIDRS or peer_trusted):
            parts = [item.strip() for item in forwarded.split(',') if item.strip()]
            if parts:
                hops = max(1, settings.TRUSTED_PROXY_HOPS)
                if len(parts) >= hops:
                    return parts[-hops]
                return parts[0]
        real_ip = request.headers.get('x-real-ip')
        if real_ip and (not settings.TRUSTED_PROXY_CIDRS or peer_trusted):
            return real_ip.strip()
    return peer_ip


async def enforce_auth_rate_limit(request: Request, action: str) -> None:
    ip = get_client_ip(request)
    key = f'ratelimit:auth:{action}:{ip}'
    await enforce_rate_limit(
        key=key,
        max_requests=settings.AUTH_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
        detail='Too many authentication attempts. Please try again later.',
    )
