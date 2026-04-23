# syntax=docker/dockerfile:1.7

# ---------- base: system deps + runtime python packages ----------
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# ---------- dev: adds lint/test tooling (ruff, mypy, pytest) ----------
# Used for CI, docker-compose dev overrides, and local exec sessions where we
# want `docker compose exec api ruff check app` to just work.
FROM base AS dev

COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt

COPY . .

RUN useradd --create-home --uid 10001 appuser \
 && chown -R appuser:appuser /app

EXPOSE 8000
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ---------- runtime: lean image for production deploys ----------
FROM base AS runtime

COPY . .

RUN useradd --create-home --uid 10001 appuser \
 && chown -R appuser:appuser /app

EXPOSE 8000
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
