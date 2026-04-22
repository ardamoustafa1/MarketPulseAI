# Automated Checks Matrix

| Control | Tooling | Gate Type | Pipeline Job |
|---|---|---|---|
| Secret exposure | gitleaks | blocking | `security-scans` |
| Python CVE scan | pip-audit | blocking | `security-scans` |
| Node CVE scan | npm audit | blocking | `security-scans` |
| SAST | semgrep | blocking | `security-scans` |
| Backend quality | pytest + coverage | blocking | `backend-tests` |
| Admin quality | vitest | blocking | `frontend-build` |
| E2E (admin+api) | playwright | blocking | `e2e-api-admin` |
| Perf regression | k6 thresholds | warning/blocking candidate | `perf-smoke` |
| Infra drift prevention | terraform validate | blocking | `terraform-validate` |
| Release safety | smoke + rollback drill | blocking | `deploy-staging`, `deploy-production` |

## Ownership map

- AppSec: security-scans, baseline updates, vulnerability SLA.
- Backend: API authz, webhook integrity, rate-limit correctness.
- Frontend: admin session safety and CSRF wiring.
- Platform: Terraform, deploy orchestration, rollback reliability.
- Product ops: SLO + funnel release gate policy.
