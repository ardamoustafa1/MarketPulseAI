# Deployment README

This document provides a reference deployment structure for MarketPulseAI.

## What is included

- Local full stack with Docker Compose (`infra/docker-compose.yml`)
- Production environment reference (`docs/PRODUCTION_ENVIRONMENT_GUIDE.md`)
- Operational runbook (`docs/RUNBOOK.md`)
- CI/CD skeleton (`.github/workflows/ci-cd.yml`)

## Compose architecture (local)

Services:
- `postgres` (stateful)
- `redis` (cache/rate-limit)
- `api` (FastAPI)
- `admin` (Nginx serving Vite static build)

## Production topology suggestion

- API on container platform (ECS/Kubernetes/Fly/Render)
- Admin served as static artifact (S3+CloudFront, Vercel, Netlify, or Nginx)
- PostgreSQL managed service with backups
- Redis managed service
- TLS + WAF at edge

## Example deployment flow

1. CI runs lint/tests/build.
2. Build and push Docker images:
   - `marketpulse-api:<sha>`
   - `marketpulse-admin:<sha>`
3. CD updates backend service and static/admin service.
4. Run smoke tests:
   - API health
   - admin page load
   - auth roundtrip

## Rollback strategy

- Keep immutable image tags per commit SHA.
- On failed smoke tests, redeploy previous known-good SHA.
- Keep DB migrations backward-compatible when possible.

## Security and compliance reminders

- No secrets in repository.
- Enforce environment-specific credentials.
- Enable audit log retention policy.
- Review dependency CVEs before production release.
