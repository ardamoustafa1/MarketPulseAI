#!/usr/bin/env bash
set -euo pipefail

# Generates strong replacement values for .env rotation workflows.
# Usage: bash infra/scripts/rotate_secrets.sh

generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

echo "SECRET_KEY=$(generate_secret)"
echo "BILLING_WEBHOOK_SECRET=$(generate_secret)"
echo "JWT_ISSUER=marketpulse-api"
echo "JWT_AUDIENCE=marketpulse-clients"
