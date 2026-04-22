#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${1:-${API_BASE_URL:-}}"
if [[ -z "${API_BASE_URL}" ]]; then
  echo "Usage: $0 <api_base_url>"
  echo "Example: $0 https://api.example.com"
  exit 1
fi

if [[ "${API_BASE_URL}" == */ ]]; then
  API_BASE_URL="${API_BASE_URL%/}"
fi

check_json_bool() {
  local url="$1"
  local key_path="$2"
  local body
  body="$(curl -fsS "$url")"
  JSON_BODY="$body" python3 - "$key_path" <<'PY'
import json
import os
import sys

key_path = sys.argv[1].split('.')
obj = json.loads(os.environ["JSON_BODY"])
for key in key_path:
    if isinstance(obj, dict):
        obj = obj.get(key)
    else:
        obj = None
        break
print("true" if obj is True else "false")
PY
}

echo "[smoke] API root check"
curl -fsS "${API_BASE_URL}/" >/dev/null

echo "[smoke] Health check"
curl -fsS "${API_BASE_URL}/api/v1/health" >/dev/null

echo "[smoke] Readiness check"
READY="$(check_json_bool "${API_BASE_URL}/api/v1/health/readiness" "ready")"
if [[ "$READY" != "true" ]]; then
  echo "Readiness check failed: ready=false"
  exit 1
fi

echo "[smoke] Price feed check"
PRICES_JSON="$(curl -fsS "${API_BASE_URL}/api/v1/prices?symbols=BTC,ETH,XAU,XAG,EURUSD,USDTRY")"
python3 - <<'PY' <<<"$PRICES_JSON"
import json
import sys

data = json.load(sys.stdin)
required = {"BTC", "ETH", "XAU", "XAG", "EURUSD", "USDTRY"}
seen = {item.get("symbol") for item in data if isinstance(item, dict)}
missing = sorted(required - seen)
if missing:
    raise SystemExit(f"Missing symbols in prices response: {', '.join(missing)}")
print("prices_ok")
PY

echo "[smoke] SUCCESS"
