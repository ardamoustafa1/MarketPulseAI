from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    alerts,
    analytics,
    assets,
    audit_logs,
    billing,
    auth,
    charts,
    health,
    insights,
    market_news,
    notifications,
    portfolio,
    prices,
    transactions,
    users,
    watchlist,
    websocket,
    strategy,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(prices.router, prefix="/prices", tags=["Market Prices"])
api_router.include_router(charts.router, prefix="/charts", tags=["Charts"])
api_router.include_router(market_news.router, prefix="/market-news", tags=["Market News"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(websocket.router, prefix="/ws", tags=["Real-time Sockets"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
api_router.include_router(insights.router, prefix="/insights", tags=["Insights"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(strategy.router, prefix="/strategy", tags=["Product Strategy"])
