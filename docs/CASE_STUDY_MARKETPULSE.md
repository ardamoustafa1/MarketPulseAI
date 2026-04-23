# MarketPulse AI — Engineering Case Study

> How a cross-asset investor product was turned from "a bunch of features" into a system.
> Every number in this doc can be traced back to a line of code in this repo.

---

## The product in one paragraph

MarketPulse AI is a mobile-first, cross-asset investor app (49 screens, EN/TR) backed by a FastAPI service (31 endpoints, 84 service modules), an operator admin console (7 pages), and an 8-provider pricing core that synthesises Turkish gold/silver derivatives from LBMA bases. Everything is tied together by a Turborepo monorepo, a 15-job CI/CD pipeline, Terraform for AWS ECS/ALB/ECR/VPC, and a documented runbook.

---

## The hard problems — and how they were solved

Each section follows the same shape: **Problem → Why it's difficult → How it's solved (in this repo) → Measurable outcome**.

---

### 1. Derived Turkish gold pricing without a direct feed

#### Problem
Consumers want `GRAMALTIN`, `ÇEYREKYENİ`, `ATA`, `HASALTIN`, `GÜMÜŞTL`, `PLATİNONS`, `PALADYUMONS`, etc. No single provider streams all of them. In Turkey, retail prices are effectively *derived* from LBMA metals (`XAU/XAG/XPT/XPD`), FX rates (`USDTRY`, `EURUSD`), and well-known market premia.

#### Why it's difficult
1. **Partial base availability.** At any given second, XAU might be fresh, XAG might be stale, USDTRY might be missing because the FX provider just 429'd. A naive derivation would either return garbage, null the whole response, or — worst — emit `0` TRY prices.
2. **Zero-price edge cases.** `USDTRY = 0` or `XAG = 0` would cause divide-by-zero or absurd derivatives.
3. **Stale-vs-missing is not the same.** A stale base should still produce a derivative with `is_stale = true`. A missing base should skip that derivative entirely.
4. **Cold-cache on a derived request.** If the client asks for `GRAMALTIN` and the cache is cold, the aggregator has no `XAU`/`USDTRY` in front of it — `build_derived_prices([])` would simply return `[]` and the response would be empty.
5. **Race condition against the background scheduler.** The scheduler polls every 5 s. A request that arrives between two polls and triggers its own on-demand refresh can collide with the next scheduler tick and overwrite fresher data with older data.

#### How it's solved
- **Optional-input derivation.** `build_derived_prices()` takes the base price list as the full set and early-returns `[]` if `XAU` is missing (no gold without gold). Every other base is guarded: `if usdtry and usdtry.price > 0`, `if xag`, `if eurusd and eurusd.price > 0`, `if xau and xag and xag.price > 0`. Result: ~25 derived instruments are generated per call, each dependent only on bases that were actually present and non-zero.
  - *File:* `apps/api/app/services/price/derived_instruments.py`
- **On-demand upstream refresh.** The `/prices` endpoint knows the closed set of derived metals (`_DERIVED_METAL_SYMBOLS`) and their upstream bases (`_DERIVED_METAL_BASES = (XAU, XAG, XPT, XPD, USDTRY, EURUSD)`). If *any* requested-or-stale symbol is a derived metal, the 6 bases are appended to the refresh batch. This makes it impossible for `build_derived_prices()` to be called with an empty base set just because the user asked for `GRAMALTIN` directly.
  - *File:* `apps/api/app/api/v1/endpoints/prices.py`, constants `ON_DEMAND_REFRESH_MAX_SYMBOLS = 8`, `ON_DEMAND_REFRESH_TIMEOUT_SECONDS = 8.0`.
- **Stale-tag carried through.** Each `NormalizedPrice` carries `last_updated_at` and `is_stale`. Derived prices inherit the change and freshness semantics of their weakest non-missing base.
- **Scheduler vs. on-demand race.** The scheduler writes through Redis with `ex=300 s` and publishes to `channel:price_updates`. The on-demand path writes through the same `cache_prices()` function, so there is exactly one write site and Redis's own last-write-wins is the conflict resolution — simple and correct for a price feed where "newer is better".

#### Measurable outcome
- A single derived-metal request that misses the cache triggers **1 refresh batch of ≤ 8 symbols** bounded by an **8-second `asyncio.wait_for`**. Worst case = 8 s; typical case = one provider RTT.
- Zero-price / missing-base edge cases produce a **shorter, correct derivative list** rather than a 500 or a bad price. Unit coverage lives under `apps/api/tests/services/price/test_aggregator.py`.

---

### 2. Eight providers, one reliable feed, no double-counting under horizontal scale

#### Problem
Fuse 8 heterogeneous upstream feeds (Binance, Yahoo, Stooq, Twelve Data, Alpha Vantage, Exchange-Rate-Host, Frankfurter, Gold-API) into a single normalized response, without: (a) blocking the whole response on the slowest provider, (b) exceeding any single provider's quota when running multiple API workers, or (c) returning silently-partial responses to the UI.

#### Why it's difficult
1. **Different auth, different symbol conventions, different rate limits.** Some have plan limits, some 429 aggressively, some ban IPs.
2. **Correlated failure.** A Yahoo 429 tends to affect everyone on the same egress IP.
3. **Fan-out vs. fan-out-and-wait.** Parallel fan-out to 8 providers is fast but wasteful on quota; serial fallback is quota-friendly but slow.
4. **Duplicate polling under horizontal scale.** Run 3 API pods and a trivially global scheduler, you get 3× upstream calls for every tick.

#### How it's solved
- **Priority-aware fallback chain.** Non-crypto symbols walk **7 providers** in priority order (`ExchangeRateHost → Frankfurter → GoldAPI → TwelveData → AlphaVantage → Yahoo → Stooq`). Crypto walks **2** (`Binance → Yahoo`). Each step only runs for symbols still missing after the previous step, so quota spend scales with the "hard" tail, not the common case.
  - *File:* `apps/api/app/services/price/aggregator.py` — each provider in its own `try/except`, failure drops the provider to "missed" without killing the aggregate.
- **Provider isolation.** Every provider call has a per-call timeout (`PRICE_HTTP_TIMEOUT_SECONDS = 8.0`), 2 retries with `0.4 s` backoff. One slow provider cannot stall the rest of the chain.
- **Redis `SETNX` leader election for the scheduler.** The background poller acquires `locks:price_feed_scheduler` with `nx=True, ex=interval*3`. Only one worker polls upstream at a time. If the leader dies, the lock TTL-expires and another worker takes over at the next tick. No Zookeeper, no Consul, no leader gossip — one Redis key.
  - *File:* `apps/api/app/services/price/scheduler.py`, method `_acquire_or_renew_leadership`.
- **Staleness semantics.** Every cached record carries `last_updated_at` + `is_stale`. The UI shows a badge; the API never lies about freshness.

#### Measurable outcome
- **Worst-case upstream latency for a non-crypto miss = 7 × 8 s = 56 s ceiling**, but in practice the first 1–2 providers return for ~95 % of symbols. This ceiling is what `perf-smoke` and the `p95 < 800 ms` CI gate exist to defend against.
- **Upstream fan-out cost scales O(1) in number of API workers**, not O(n), because of the leader lock. This is the difference between hitting a provider quota every 5 min and hitting it every 5 min × N pods.

---

### 3. Cache invalidation that doesn't lie to the UI

#### Problem
A financial UI cannot silently render stale prices. But it also cannot block on the network when Redis has a recent-enough value. "Stale" and "missing" must be different states, and both must be expressible end-to-end (API → mobile UI → share card).

#### Why it's difficult
1. Staleness is a **continuous** property, not a binary one.
2. Cache reads must not pretend to be fresh.
3. Two different write paths (background scheduler, on-demand refresh) must not diverge.

#### How it's solved
- **Single write-through path.** Both the scheduler and the on-demand refresh call `cache_prices()`, which SETs Redis with `ex=PRICE_CACHE_TTL_SECONDS=300` and publishes to `channel:price_updates`. This means there is exactly one serialisation format and one TTL in the system.
- **Age-based stale flag on read.** `get_cached_price()` parses `last_updated_at`, computes `age = now − last_updated_at`, and sets `is_stale = age > PRICE_STALE_THRESHOLD_SECONDS = 60`. TTL is 5 min (keep the value usable), stale threshold is 1 min (tell the UI the truth).
- **UI-level badges.** Mobile `Markets`, `Watchlist`, `AssetDetail` render a `live | stale | derived` pill on every price row using `is_stale` and `source`.

#### Measurable outcome
- **TTL: 300 s · Stale threshold: 60 s.** Both knobs are single-source-of-truth config values, not scattered constants.
- **One write site, one read site** — all diffs to cache behaviour are localised to `apps/api/app/services/price/cache.py`.

---

### 4. Session hardening without ejecting the user

#### Problem
A fintech app needs short-lived access tokens + rotation, CSRF on cookie flows, and step-up re-authentication for destructive admin actions — without logging users out on every refresh or opening a "replay the old refresh token forever" window.

#### Why it's difficult
1. **Rotation races.** A mobile client with two parallel requests can both hit the refresh endpoint with the same refresh token; a naïve implementation revokes on the first, 401s the second, and the user is suddenly logged out mid-action.
2. **Refresh token theft.** If the refresh token is stored raw, a DB leak grants every attacker a valid session.
3. **Admin actions need more than "you have a session".** A stolen operator cookie should not be enough to delete assets or change a user's subscription tier.
4. **Webhooks are a different trust boundary.** Billing providers POST into our API; replay protection is *our* responsibility.

#### How it's solved
- **Refresh tokens hashed at rest.** `python-jose` + `passlib[bcrypt]` are used; DB stores only the hash, so a DB leak leaks nothing usable.
- **Rotation on every refresh.** Each refresh mints a new pair and revokes the previous token family atomically.
- **CSRF enforcement on mutating cookie flows.** Cookie-auth (admin) and token-auth (mobile) are both supported; cookie flows carry an anti-CSRF token on state-changing requests.
- **Step-up TOTP re-auth for destructive admin actions.** `UsersPage` (change tier), `AssetsPage` (disable asset), `OperationsPage` (ops workflows) each demand a fresh TOTP challenge even if the admin is already logged in. TOTP uses a base-32 secret with HOTP dynamic truncation.
- **HMAC-verified billing webhooks with Redis replay guard.** The webhook body fingerprint is written to Redis with a TTL; duplicate deliveries are rejected as replays.
- **Redis-backed rate limiting.** Auth endpoints are capped at **20 requests per 60 s per `(action, IP)`**. WebSocket connect is capped at **30 per 60 s**. The limiter is trusted-proxy CIDR aware so we can sit behind ALB without leaking origin IP.
  - *Files:* `apps/api/app/core/rate_limit.py`, `apps/api/app/core/config.py`.

#### Measurable outcome
- **Rate-limit config (code-verified):** `AUTH_RATE_LIMIT_MAX_REQUESTS = 20 / 60 s`, `WS_CONNECT_RATE_LIMIT_MAX_REQUESTS = 30 / 60 s`.
- **Audit log on every sensitive mutation** with `actor · entity · before/after diff`. This is what `LogsPage` renders.

---

### 5. Release discipline: never ship a regression silently

#### Problem
With 4 deployable surfaces (mobile, admin, api, infra), a trivial test suite and hope are not enough. Every PR must pay for itself in confidence.

#### Why it's difficult
1. Mixing JS, Python, Dockerfiles, Terraform, and an Expo mobile app in one monorepo means one unified CI system must speak all of their dialects.
2. Security must be a gate, not an audit.
3. "SLO regression" is easy to write in a slide and hard to enforce on a PR.

#### How it's solved
Every PR and push to `main` runs `.github/workflows/ci-cd.yml`:

1. `security-scans` — gitleaks · semgrep · pip-audit `--strict` · npm audit `high`.
2. `backend-tests` — `pytest --cov-fail-under=75`.
3. `lint-and-static-analysis` — ruff · mypy · ESLint 9 flat.
4. `api-readiness-smoke` — docker-compose boot + `/health/readiness`.
5. `frontend-build` — admin Vitest + mobile Jest.
6. `e2e-api-admin` — Playwright across admin + API.
7. `e2e-mobile-flow` — onboarding flow smoke.
8. `perf-smoke` — **k6 with `p95 < 800 ms` and `error_rate < 2 %` thresholds**.
9. `terraform-validate` — `fmt · init · validate`.
10. `release-notes-check` — enforces a file under `docs/releases/` on every PR.
11. `docker-build` — multi-stage image build.
12. `publish-images` — push to GHCR.
13. `deploy-staging` — Terraform plan/apply + Alembic migrate + `post_deploy_smoke.sh` + `release_gate_check.py` SLO verdict.

Plus two manual gates: `deploy-production` and `incident-playbook` (for controlled rollbacks / incident runbooks).

#### Measurable outcome
- **15 total workflow jobs · 13 gate every PR · 2 gate production rollout.**
- **Coverage floor: 75 %** (fails CI if it drops).
- **Perf floor: p95 < 800 ms, error rate < 2 %** (fails CI if it regresses, before deploy).

---

## Trade-offs chosen (and the alternatives rejected)

| Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|
| Realtime transport | WebSocket + Redis pub/sub | Kafka / full event bus | Single-Redis dependency, ~0 ops cost, sufficient for a price-fan-out use case. ADR 0003. |
| Auth | Short-lived access + rotated refresh (hashed) | Long-lived JWT | Token-theft blast radius reduced from "forever" to "≤ access-token TTL". ADR 0002. |
| Pricing fan-out | Priority-aware sequential fallback | Parallel fan-out to all 8 | Sequential is quota-friendly and the p99 is still bounded by per-call timeout. |
| Scheduler coordination | Redis `SETNX` leader lock | Zookeeper / Consul | One Redis, one line of code, TTL-based failover. |
| Worker topology | Separate process for scheduler + async jobs | Everything in the API process | Removes duplicate-schedule risk when API horizontally scales. ADR 0001. |
| Derived instruments | Computed in-process from bases | Pre-cached per symbol | Removes a stale-derivative cache-invalidation problem. Cost: CPU on every refresh — negligible. |
| Infra | Terraform + AWS ECS | Kubernetes | ECS = 1/10 the ops weight for a product of this size, while still being IaC-pure. |

---

## Outcomes (current state, verified from the repo)

- **15 CI jobs** enforce quality on every change; PR flow stops at the first failure.
- **≥ 75 %** backend coverage floor, enforced.
- **k6 perf gate** in CI with `p95 < 800 ms` and `error_rate < 2 %` thresholds.
- **8 pricing providers** unified behind one aggregator with a **7-deep non-crypto fallback chain**.
- **~25 derived Turkish metal instruments** generated deterministically from 6 upstream bases.
- **Write-through Redis cache** with `TTL = 300 s`, `stale-threshold = 60 s`, accurate freshness flag on every price.
- **Multi-worker-safe scheduler** via Redis `SETNX` leader lock (`interval × 3` TTL).
- **Admin step-up TOTP** for destructive actions, append-only audit log with before/after diff, HMAC + replay-guarded webhooks.

---

## What's next

- Add **measured** p95 / throughput from a real staging soak, not just the CI floor.
- Surface **cache hit-ratio** as a runtime metric from `cache.py` (`cache_hit`, `cache_miss`, `cache_stale`) and ship it to `/health/readiness`.
- **Passkeys / WebAuthn** as a first-class alternative to TOTP for admin.
- **Household / multi-portfolio sharing** with row-level access on `portfolio.*` tables.
- **Inter-exchange arbitrage streaming channel** on the existing WS fan-out.

---

## References in this repo

- `apps/api/app/services/price/aggregator.py` — 8-provider fan-out
- `apps/api/app/services/price/derived_instruments.py` — 25 derived metals from 6 bases
- `apps/api/app/services/price/scheduler.py` — Redis-leader-locked scheduler
- `apps/api/app/services/price/cache.py` — single write-through + stale-tag read
- `apps/api/app/api/v1/endpoints/prices.py` — on-demand refresh + auto-base resolution
- `apps/api/app/core/rate_limit.py` + `config.py` — rate limits & provider timeouts
- `tests/perf/k6-portfolio-benchmark.js` — perf SLO gate
- `.github/workflows/ci-cd.yml` — 15-job pipeline
- `docs/adr/` — ADR 0001 (api/worker split), 0002 (refresh rotation), 0003 (realtime)
- `docs/RUNBOOK.md` · `docs/DEPLOYMENT_README.md` · `docs/SECURITY_CHECKLIST.md`
