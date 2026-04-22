from fastapi import APIRouter
from sqlalchemy import text
from app.core.config import settings
from app.services.price.scheduler import aggregated_provider
from app.db.session import engine
from app.db.redis import get_redis_client

router = APIRouter()

@router.get("/readiness")
async def readiness_check():
    db_ok = False
    redis_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    binance_healthy = await aggregated_provider.binance_provider.is_healthy()
    yahoo_healthy = await aggregated_provider.yahoo_provider.is_healthy()
    feed_ok = binance_healthy or yahoo_healthy

    overall = db_ok and redis_ok and feed_ok
    return {
        "ready": overall,
        "checks": {
            "database": db_ok,
            "redis": redis_ok,
            "price_feed": feed_ok,
            "binance": binance_healthy,
            "yahoo": yahoo_healthy,
        },
    }

@router.get("/")
async def health_check():
    binance_healthy = await aggregated_provider.binance_provider.is_healthy()
    yahoo_healthy = await aggregated_provider.yahoo_provider.is_healthy()
    return {
        "status": "active",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "price_feed": {
            "aggregator_healthy": binance_healthy or yahoo_healthy,
            "binance": binance_healthy,
            "yahoo": yahoo_healthy,
        },
    }
