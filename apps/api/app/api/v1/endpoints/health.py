from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.core.config import settings
from app.services.price.scheduler import aggregated_provider
from app.db.session import engine
from app.db.redis import get_redis_client
from app.observability.metrics import release_gate_status, slo, snapshot
from app.api.deps import get_current_admin
from app.models.user import User

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
    return {"ready": overall}


@router.get("/readiness/details")
async def readiness_details(current_admin: User = Depends(get_current_admin)):
    _ = current_admin
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
    return {
        "ready": db_ok and redis_ok and feed_ok,
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
    return {
        "status": "active",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT if settings.ENVIRONMENT == "development" else "hidden",
    }


@router.get("/metrics")
async def metrics_snapshot(current_admin: User = Depends(get_current_admin)):
    _ = current_admin
    return snapshot()


@router.get("/slo")
async def slo_snapshot(window_seconds: int = 300, current_admin: User = Depends(get_current_admin)):
    _ = current_admin
    window = max(60, min(window_seconds, 3600))
    return slo(window_seconds=window)


@router.get("/incidents")
async def incident_center(current_admin: User = Depends(get_current_admin)):
    _ = current_admin
    metrics = snapshot()
    current_slo = slo(window_seconds=300)
    p95 = float(metrics.get("latency_p95_ms", 0) or 0)
    error_rate = float(current_slo.get("error_rate_percent", 0) or 0)
    queue_lag = float(metrics.get("queue_lag_seconds", 0) or 0)
    webhook_failures = int(metrics.get("billing_webhook_failures_1h", 0) or 0)
    incidents: list[dict[str, str | float | int]] = []
    if error_rate >= 2:
        incidents.append({"type": "error_spike", "severity": "high", "value": round(error_rate, 2)})
    if p95 >= 800:
        incidents.append({"type": "latency_spike", "severity": "medium", "value": round(p95, 2)})
    if queue_lag >= 120:
        incidents.append({"type": "queue_lag", "severity": "high", "value": round(queue_lag, 2)})
    if webhook_failures > 0:
        incidents.append({"type": "webhook_failures", "severity": "medium", "value": webhook_failures})
    return {
        "open_incident_count": len(incidents),
        "incidents": incidents,
    }


@router.get("/release-gate")
async def release_gate(
    coach_conversion_percent_7d: float = 0.0,
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    return release_gate_status(coach_conversion_percent_7d=coach_conversion_percent_7d)
