#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is not installed. Install Terraform >= 1.6.0 and retry."
  exit 1
fi

echo "[1/3] Terraform fmt check"
terraform -chdir="${ROOT_DIR}/infra/terraform" fmt -check

echo "[2/3] Terraform init (backend disabled)"
terraform -chdir="${ROOT_DIR}/infra/terraform" init -backend=false

echo "[3/3] Terraform validate"
terraform -chdir="${ROOT_DIR}/infra/terraform" validate

echo "Terraform validation completed successfully."
