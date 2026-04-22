#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Preparing live demo stack..."
bash infra/scripts/bootstrap_local.sh

echo ""
echo "Live demo is running."
echo "Admin Panel: http://localhost:5173"
echo "API Docs:    http://localhost:8000/docs"
echo "Readiness:   http://localhost:8000/api/v1/health/readiness"
