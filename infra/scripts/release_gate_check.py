#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from urllib.request import Request, urlopen


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict:
    req = Request(url, headers=headers or {})
    with urlopen(req, timeout=15) as resp:  # nosec B310
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    api_url = os.environ.get("API_BASE_URL", "").rstrip("/")
    if not api_url:
        print("API_BASE_URL is required")
        return 2

    max_error_rate = float(os.environ.get("RELEASE_GATE_MAX_ERROR_RATE", "0.02"))
    max_p95 = float(os.environ.get("RELEASE_GATE_MAX_P95_MS", "800"))
    min_coach_conversion = float(os.environ.get("RELEASE_GATE_MIN_COACH_CONVERSION", "5"))

    slo = fetch_json(f"{api_url}/api/v1/health/slo")
    error_rate = float(slo.get("error_rate", 0))
    p95 = float(slo.get("p95_latency_ms", 0))

    coach_conversion = 0.0
    admin_token = os.environ.get("RELEASE_GATE_ADMIN_TOKEN", "").strip()
    if admin_token:
        north_star = fetch_json(
            f"{api_url}/api/v1/strategy/north-star",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        coach_conversion = float(north_star.get("coach_action_conversion_percent_7d", 0))

    failed: list[str] = []
    if error_rate > max_error_rate:
        failed.append(f"error_rate={error_rate} exceeds {max_error_rate}")
    if p95 > max_p95:
        failed.append(f"p95={p95} exceeds {max_p95}")
    if admin_token and coach_conversion < min_coach_conversion:
        failed.append(f"coach_conversion={coach_conversion} below {min_coach_conversion}")

    print(
        json.dumps(
            {
                "error_rate": error_rate,
                "p95_latency_ms": p95,
                "coach_conversion_percent_7d": coach_conversion,
                "failed_rules": failed,
            }
        )
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
