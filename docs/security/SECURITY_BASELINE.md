# Security Baseline

## Scope

This baseline defines mandatory controls for API, admin UI, mobile telemetry, and CI/CD.

## Mandatory controls

- Authentication uses short-lived access tokens and rotated refresh tokens.
- Admin auth transport uses HttpOnly cookies with CSRF header validation.
- Password changes require current-password re-auth and step-up token challenge.
- Webhook ingestion requires signature validation and replay prevention (cache + persistent dedup).
- Rate limiting uses trusted edge IP extraction (`TRUSTED_PROXY_CIDRS`) and per-action keys.
- Public snapshots enforce TTL, revoke, and rotation controls.
- Health and observability endpoints are split by public/private access.
- Security-sensitive actions are audit logged.

## Deployment baseline

- Secret scanning and dependency audit are blocking CI gates.
- Terraform validation and environment-specific plans are mandatory.
- Staging deploy requires smoke checks before production approval.
- Rollback command path must be validated on each release candidate.
