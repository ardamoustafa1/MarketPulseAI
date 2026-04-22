from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from time import time


@dataclass
class RequestSample:
    ts: float
    status_code: int
    latency_ms: float


_lock = Lock()
_request_count = 0
_error_count = 0
_path_counts: dict[str, int] = defaultdict(int)
_method_counts: dict[str, int] = defaultdict(int)
_samples: deque[RequestSample] = deque(maxlen=5000)


def record_request(path: str, method: str, status_code: int, latency_ms: float) -> None:
    global _request_count, _error_count
    with _lock:
        _request_count += 1
        _path_counts[path] += 1
        _method_counts[method] += 1
        if status_code >= 500:
            _error_count += 1
        _samples.append(RequestSample(ts=time(), status_code=status_code, latency_ms=latency_ms))


def _window_samples(window_seconds: int) -> list[RequestSample]:
    cutoff = time() - window_seconds
    with _lock:
        return [s for s in _samples if s.ts >= cutoff]


def snapshot() -> dict:
    with _lock:
        total = _request_count
        errors = _error_count
        path_counts = dict(_path_counts)
        method_counts = dict(_method_counts)
    error_rate = (errors / total) if total else 0.0
    return {
        "requests_total": total,
        "server_errors_total": errors,
        "error_rate_total": round(error_rate, 4),
        "paths": path_counts,
        "methods": method_counts,
    }


def slo(window_seconds: int = 300, max_error_rate: float = 0.01, max_p95_latency_ms: float = 800) -> dict:
    samples = _window_samples(window_seconds)
    total = len(samples)
    if total == 0:
        return {
            "window_seconds": window_seconds,
            "request_count": 0,
            "error_rate": 0.0,
            "p95_latency_ms": 0.0,
            "targets": {
                "max_error_rate": max_error_rate,
                "max_p95_latency_ms": max_p95_latency_ms,
            },
            "breach": False,
        }

    errors = sum(1 for s in samples if s.status_code >= 500)
    error_rate = errors / total
    latencies = sorted(s.latency_ms for s in samples)
    idx = min(len(latencies) - 1, int(0.95 * len(latencies)))
    p95 = latencies[idx]
    breach = error_rate > max_error_rate or p95 > max_p95_latency_ms
    return {
        "window_seconds": window_seconds,
        "request_count": total,
        "error_rate": round(error_rate, 4),
        "p95_latency_ms": round(p95, 2),
        "targets": {
            "max_error_rate": max_error_rate,
            "max_p95_latency_ms": max_p95_latency_ms,
        },
        "breach": breach,
    }
