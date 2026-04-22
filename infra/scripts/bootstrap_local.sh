#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/7] Install monorepo dependencies"
npm install

echo "[2/7] Prepare infra environment file"
if [[ ! -f "infra/.env" ]]; then
  cp "infra/.env.example" "infra/.env"
fi

echo "[3/7] Start postgres + redis + api + worker + admin"
docker compose --env-file "infra/.env" -f "infra/docker-compose.yml" up -d postgres redis api api_worker admin

echo "[4/7] Install API dependencies"
python3 -m pip install -r "apps/api/requirements.txt"

echo "[5/7] Run database migrations"
cd "apps/api"
alembic upgrade head

echo "[6/7] Seed demo data"
python3 -m app.db.seed
cd "$ROOT_DIR"

echo "[7/7] Generate OpenAPI types"
npm run generate:api-types || true

echo ""
echo "Local setup is ready."
echo "Admin: http://localhost:5173"
echo "API:   http://localhost:8000/docs"
echo "Demo users:"
echo " - admin@marketpulse.ai / Admin123!"
echo " - demo@marketpulse.ai  / Demo12345!"
