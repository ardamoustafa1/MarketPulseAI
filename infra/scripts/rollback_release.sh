#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ENVIRONMENT=staging \
# ROLLBACK_API_CMD="kubectl -n marketpulse set image deploy/api api=ghcr.io/org/marketpulse-api:<tag>" \
# ROLLBACK_ADMIN_CMD="kubectl -n marketpulse set image deploy/admin admin=ghcr.io/org/marketpulse-admin:<tag>" \
# API_BASE_URL=https://staging-api.example.com \
# bash infra/scripts/rollback_release.sh

ENVIRONMENT="${ENVIRONMENT:-}"
PREVIOUS_API_IMAGE="${PREVIOUS_API_IMAGE:-}"
PREVIOUS_ADMIN_IMAGE="${PREVIOUS_ADMIN_IMAGE:-}"
ROLLBACK_API_CMD="${ROLLBACK_API_CMD:-}"
ROLLBACK_ADMIN_CMD="${ROLLBACK_ADMIN_CMD:-}"

if [[ -z "${ENVIRONMENT}" ]]; then
  echo "ENVIRONMENT is required."
  exit 1
fi
if [[ -z "${ROLLBACK_API_CMD}" || -z "${ROLLBACK_ADMIN_CMD}" ]]; then
  echo "ROLLBACK_API_CMD and ROLLBACK_ADMIN_CMD are required."
  echo "Provide concrete deployment rollback commands for your platform."
  exit 1
fi

echo "[rollback] environment=${ENVIRONMENT}"
if [[ -n "${PREVIOUS_API_IMAGE}" ]]; then
  echo "[rollback] previous_api_image=${PREVIOUS_API_IMAGE}"
fi
if [[ -n "${PREVIOUS_ADMIN_IMAGE}" ]]; then
  echo "[rollback] previous_admin_image=${PREVIOUS_ADMIN_IMAGE}"
fi

echo "[rollback] Executing API rollback command..."
bash -lc "${ROLLBACK_API_CMD}"
echo "[rollback] Executing Admin rollback command..."
bash -lc "${ROLLBACK_ADMIN_CMD}"

echo "[rollback] Running post-deploy smoke checks..."
if [[ -n "${API_BASE_URL:-}" ]]; then
  bash infra/scripts/post_deploy_smoke.sh "${API_BASE_URL}"
else
  echo "API_BASE_URL not set, skipping smoke check."
fi

echo "[rollback] Completed."
