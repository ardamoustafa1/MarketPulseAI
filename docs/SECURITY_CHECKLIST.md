# Security Checklist

## Authentication and tokens

- [x] Access tokens include issuer (`iss`), audience (`aud`), issued-at (`iat`), and token type claims.
- [x] Access token validation enforces issuer/audience and token type (`access`).
- [x] Refresh tokens are rotated and previous token records are revoked.
- [x] Refresh tokens are stored as SHA-256 hashes, never in plaintext.
- [x] Refresh/logout validates token ownership before revocation actions.

## Abuse prevention and rate limiting

- [x] Redis-backed per-IP auth endpoint rate limiting (register/login/refresh).
- [x] Redis-backed websocket connect attempt rate limiting.
- [x] Brute-force protection on login by email.

## Input validation

- [x] Password and token fields constrained with min/max lengths.
- [x] Password strength policy enforced (upper/lower/number/symbol).
- [x] Validation errors return sanitized payload messages.

## Authorization and admin controls

- [x] Admin endpoint enforces admin role guard.
- [x] Role-based checks remain enforced for protected user endpoints.

## Secrets and configuration

- [x] Startup rejects weak `SECRET_KEY` in non-development environments.
- [x] JWT issuer/audience configurable via environment.

## Observability and auditability

- [x] Security-sensitive auth/admin actions emit audit log entries.
- [x] Logout/login/register/refresh/admin-read actions tracked.

## Error handling

- [x] Global unhandled exception response sanitized.
- [x] Validation errors use generic response body to avoid leaking internals.

## Dependency hygiene

- [x] Security guidance included in README for routine updates/audits.
- [ ] Add automated CVE scanning in CI (`pip-audit`, `npm audit --production`).
- [ ] Add dependency pinning/lockfile integrity checks to release pipeline.
