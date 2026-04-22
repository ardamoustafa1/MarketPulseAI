from app.main import app


def test_expected_api_routes_are_mounted():
    paths = {route.path for route in app.routes}

    expected_paths = {
        '/api/v1/auth/login',
        '/api/v1/users/me',
        '/api/v1/prices/',
        '/api/v1/ws/',
        '/api/v1/alerts/',
        '/api/v1/watchlist/',
        '/api/v1/insights/',
        '/api/v1/insights/generate',
        '/api/v1/assets/',
        '/api/v1/portfolio/',
        '/api/v1/portfolio/benchmark',
        '/api/v1/transactions/',
        '/api/v1/transactions/export/tax-report',
        '/api/v1/transactions/report-jobs',
        '/api/v1/audit-logs/',
        '/api/v1/health/',
        '/api/v1/health/metrics',
        '/api/v1/health/slo',
        '/api/v1/billing/entitlements',
        '/api/v1/alerts/suggestions',
        '/api/v1/notifications/weekly-summary',
        '/api/v1/strategy/coach-loop',
        '/api/v1/strategy/goals',
        '/api/v1/strategy/risk-report',
        '/api/v1/strategy/public-snapshot/create',
        '/api/v1/strategy/public-snapshot/{share_token}/revoke',
        '/api/v1/strategy/north-star',
        '/api/v1/admin/',
    }

    missing = expected_paths - paths
    assert not missing, f'Missing mounted routes: {missing}'
