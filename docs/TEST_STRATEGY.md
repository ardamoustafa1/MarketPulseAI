# MarketPulseAI Test Strategy

## Scope and priorities

- Protect revenue-impacting paths first: auth, portfolio math, alert triggering, and realtime websocket delivery.
- Keep tests layered so failures are diagnosable:
  - unit tests validate pure/domain logic,
  - integration tests validate component collaboration,
  - flow tests validate user-critical journeys.

## Backend strategy

- Unit tests
  - `AuthService` brute-force protection and success/failure behavior.
  - `PortfolioCalculationEngine` arithmetic correctness and guardrails.
  - `AlertEvaluatorService` condition handling and one-shot deactivation.
  - `ConnectionManager` subscription lifecycle and dead-socket cleanup.
- Integration tests
  - websocket dispatcher + manager collaboration for ping/subscribe/broadcast.
- Auth tests
  - password hashing, verification, and token claim integrity.
- Edge-case policy
  - explicit cases for invalid quantities, oversell attempts, missing prices, and threshold boundaries.

## Mobile strategy

- Component tests
  - foundational UI primitives (e.g., `Text`) render and prop contract.
- Screen tests
  - auth screen actions trigger expected handlers (`login`, `goBack`).
- Basic flow tests
  - transaction validation flow: sanitize -> validate -> compute totals -> build payload.
  - onboarding activation e2e smoke contract (`onboardingFlow.e2e.test.ts`).

## Admin strategy

- Critical route matrix tests
  - dashboard/users/assets/logs/health/operations route presence and protection contract.
- Auth helper tests
  - csrf extraction and secure header-building behavior.
- Route guard tests
  - role-based access contract (`super_admin`, `ops_admin`, `viewer`).

## End-to-end strategy

- Playwright admin-ui smoke:
  - login page load and critical control visibility.
- Playwright API smoke:
  - health + readiness contract.
- Mobile flow smoke:
  - onboarding journey contract.
- Performance smoke:
  - k6 threshold gate for request failure and p95 latency.

## Quality gates

- Backend: `pytest` green before merge.
- Admin: `vitest` green before merge.
- Mobile: `npm test` green before merge.
- E2E: Playwright API/Admin + mobile flow smoke must pass in CI.
- Perf: k6 perf-smoke thresholds must pass in CI.
- Any bugfix must include a test that would have failed before the fix.

## Remaining coverage targets

- API endpoint integration tests with dependency overrides and transactional test DB.
- E2E websocket handshake/auth tests with real `TestClient.websocket_connect`.
- Mobile navigation flow tests (`RootNavigator` auth -> app transition).
- Store tests for `useAuthStore` hydration/logout with mocked SecureStore.
