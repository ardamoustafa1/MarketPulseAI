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
        '/api/v1/assets/',
        '/api/v1/portfolio/',
        '/api/v1/transactions/',
        '/api/v1/audit-logs/',
        '/api/v1/health/',
        '/api/v1/admin/',
    }

    missing = expected_paths - paths
    assert not missing, f'Missing mounted routes: {missing}'
