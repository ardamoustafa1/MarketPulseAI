#!/usr/bin/env bash
set -euo pipefail

# Usage:
# API_URL=http://localhost:8000 ADMIN_TOKEN=... bash infra/scripts/security_incident_response.sh [user_id]
#
# Steps:
# 1) Generate new secrets to rotate
# 2) Revoke refresh tokens globally or for a user

if [[ -z "${API_URL:-}" || -z "${ADMIN_TOKEN:-}" ]]; then
  echo "API_URL and ADMIN_TOKEN are required."
  echo "Example: API_URL=http://localhost:8000 ADMIN_TOKEN=... bash infra/scripts/security_incident_response.sh"
  exit 1
fi

TARGET_USER_ID="${1:-}"

echo "[1/2] Suggested rotated secrets:"
bash infra/scripts/rotate_secrets.sh

if [[ -n "$TARGET_USER_ID" ]]; then
  PAYLOAD="{\"user_id\":\"$TARGET_USER_ID\",\"reason\":\"security_incident\"}"
else
  PAYLOAD='{"reason":"security_incident"}'
fi

echo "[2/2] Revoking refresh tokens..."
curl -sS -X POST "${API_URL}/api/v1/admin/security/revoke-refresh-tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "$PAYLOAD"

echo
echo "Incident response complete. Rotate leaked credentials in provider dashboards too."
