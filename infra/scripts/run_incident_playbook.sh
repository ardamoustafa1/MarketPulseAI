#!/usr/bin/env bash
set -euo pipefail

# Usage:
# INCIDENT_TYPE=security API_URL=... ADMIN_TOKEN=... ADMIN_STEP_UP_TOKEN=... ADMIN_STEP_UP_TOTP=... bash infra/scripts/run_incident_playbook.sh

INCIDENT_TYPE="${INCIDENT_TYPE:-security}"
API_URL="${API_URL:-}"

if [[ -z "${API_URL}" ]]; then
  echo "API_URL is required."
  exit 1
fi

echo "[playbook] Incident type: ${INCIDENT_TYPE}"
echo "[playbook] Running post-deploy smoke checks"
bash infra/scripts/post_deploy_smoke.sh "${API_URL}"

if [[ "${INCIDENT_TYPE}" == "security" ]]; then
  echo "[playbook] Executing security response automation"
  bash infra/scripts/security_incident_response.sh "${TARGET_USER_ID:-}"
fi

echo "[playbook] Completed."
