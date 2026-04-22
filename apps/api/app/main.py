from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import time
from uuid import uuid4

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.core.security import validate_secret_strength
from app.api.v1.api import api_router
from app.services.price.scheduler import global_price_scheduler
from app.services.alert.evaluator import global_alert_evaluator
from app.api.deps import get_ws_manager
from app.services.websocket.redis_listener import RedisWebSocketBridge
from app.db.session import engine
from app.db.redis import redis_pool
from app.core.exceptions import (
    EntityNotFoundException,
    BusinessRuleException,
    UnauthorizedException,
    ForbiddenException
)

logger = logging.getLogger(__name__)

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        environment=settings.ENVIRONMENT,
        release=settings.SENTRY_RELEASE,
    )

# Initialize the globally shared WS listener tied to our DI manager
global_redis_ws_bridge = RedisWebSocketBridge(manager=get_ws_manager())

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_secret_strength()
    app_role = settings.APP_ROLE.lower().strip()
    start_scheduler = settings.PRICE_SCHEDULER_ENABLED and app_role in {"all", "worker"}
    start_ws_bridge = app_role in {"all", "api"}
    start_alerts = app_role in {"all", "worker"}
    # Startup actions
    if start_scheduler:
        await global_price_scheduler.start()
    if start_ws_bridge:
        global_redis_ws_bridge.start()
    if start_alerts:
        global_alert_evaluator.start()
    yield
    # Shutdown actions
    if start_scheduler:
        await global_price_scheduler.stop()
    if start_alerts:
        global_alert_evaluator.stop()
    if start_ws_bridge:
        await global_redis_ws_bridge.stop()
    
    # Graceful shutdown of connection pools preventing hanging OS File Descriptors
    await redis_pool.disconnect()
    engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="MarketPulse AI Core Backend Services",
    lifespan=lifespan
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    started_at = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    logger.info(
        "request_completed method=%s path=%s status=%s elapsed_ms=%.2f request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    if settings.SENTRY_DSN:
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("request_id", request_id)
            if settings.SENTRY_RELEASE:
                scope.set_tag("release", settings.SENTRY_RELEASE)
    return response

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global Exception Handlers
@app.exception_handler(EntityNotFoundException)
async def not_found_exception_handler(request: Request, exc: EntityNotFoundException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail, "error": "Not Found"})

@app.exception_handler(BusinessRuleException)
async def business_rule_exception_handler(request: Request, exc: BusinessRuleException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail, "error": "Bad Request"})

@app.exception_handler(UnauthorizedException)
async def unauthorized_exception_handler(request: Request, exc: UnauthorizedException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail, "error": "Unauthorized"}, headers=exc.headers)

@app.exception_handler(ForbiddenException)
async def forbidden_exception_handler(request: Request, exc: ForbiddenException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail, "error": "Forbidden"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"message": "Invalid request payload", "error": "Validation Error"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected server error occurred.", "error": "Internal Server Error"},
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root_redirect():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Visit /docs for OpenAPI specifications."}
