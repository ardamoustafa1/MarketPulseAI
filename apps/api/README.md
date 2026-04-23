# API (FastAPI)

`apps/api` MarketPulse backend servisidir. Kimlik dogrulama, portfoy, piyasa veri akisi ve operasyon endpoint'lerini sunar.

## Gereksinimler

- Python 3.11
- PostgreSQL
- Redis

## Lokal Calistirma

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test ve Kalite

```bash
cd apps/api
pytest --cov=app --cov-report=term-missing
ruff check app tests
mypy app --config-file mypy.ini
```

## Onemli Endpointler

- OpenAPI: `http://localhost:8000/docs`
- Readiness: `http://localhost:8000/api/v1/health/readiness`
- Liveness: `http://localhost:8000/api/v1/health/liveness`

## Notlar

- Ortam degiskenleri icin `.env.example` dosyasini baz alin.
- Uretim benzeri akista migration adimi deployment oncesi zorunludur.
