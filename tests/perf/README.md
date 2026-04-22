# Performance Suite

## k6 smoke load

Run against local API:

```bash
API_BASE_URL=http://127.0.0.1:8000 k6 run tests/perf/k6-portfolio-benchmark.js
```

Tunable env vars:
- `K6_VUS` (default `10`)
- `K6_DURATION` (default `45s`)

This suite is CI-gated with p95 and error-rate thresholds.
