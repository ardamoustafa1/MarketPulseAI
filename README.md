# MarketPulse AI

This is a production-grade monorepo for MarketPulse AI, a premium portfolio and market tracking application.

![CI](https://img.shields.io/github/actions/workflow/status/ardamoustafa1/MarketPulseAI/ci-cd.yml?branch=main&label=CI)
![Security](https://img.shields.io/badge/security-gitleaks%20%2B%20semgrep%20%2B%20audit-blue)
![Coverage](https://img.shields.io/badge/coverage-backend%20xml-informational)
![Release Notes](https://img.shields.io/badge/release%20notes-required-success)

## 🧱 Architecture

- `apps/mobile`: React Native (Expo) app.
- `apps/admin`: React (Vite) admin panel using TailwindCSS.
- `apps/api`: Python (FastAPI) core backend.
- `packages/ui`: Shared React components.
- `packages/types`: Shared TypeScript definitions and Zod schemas.
- `packages/config`: ESLint, Prettier, and TypeScript base configurations.
- `infra`: Docker-compose and deployment scripts.

## 🚀 Getting Started

Ensure you have Node.js, `yarn` or `npm`, and Python 3.11+ installed.

### One-command local setup (recommended)

```bash
npm run setup:local
```

This command will:
- install dependencies,
- start local infra and services,
- apply migrations,
- seed real demo data,
- generate API types.

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` files to `.env` in the respective `apps/` directories.

3. **Infrastructure:**
   Start PostgreSQL and Redis:
   ```bash
   cd infra && docker-compose up -d
   ```

4. **Dev Servers:**
   Run all frontend/node services via Turborepo:
   ```bash
   npm run dev
   ```

   Run FastAPI server separately (or configure a python process runner):
   ```bash
   cd apps/api
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

## 🐳 Full Stack with Docker

- Copy env template:
  - `cp infra/.env.example infra/.env`
- Start full stack:
  - `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build`
- Services:
  - API: `http://localhost:8000`
  - Admin: `http://localhost:5173`
  - Postgres: `localhost:5432`
  - Redis: `localhost:6379`

## 🎬 Live Demo (local)

```bash
npm run demo:live
```

Demo credentials:
- `admin@marketpulse.ai / Admin123!`
- `demo@marketpulse.ai / Demo12345!`

## 📦 Deployment Docs

- Deployment overview: `docs/DEPLOYMENT_README.md`
- Production environment guide: `docs/PRODUCTION_ENVIRONMENT_GUIDE.md`
- Operations runbook: `docs/RUNBOOK.md`
- Security checklist: `docs/SECURITY_CHECKLIST.md`
- App Store release checklist: `docs/APP_STORE_RELEASE_CHECKLIST.md`
- ADR index: `docs/adr/README.md`
- Priority action plan: `docs/PRIORITY_ACTION_PLAN.md`
- Case study: `docs/CASE_STUDY_MARKETPULSE.md`
- Release notes discipline: `docs/releases/README.md`

## ✅ Post-Deploy Smoke

Run smoke checks against a deployed API:

```bash
bash infra/scripts/post_deploy_smoke.sh https://api.<your-domain>
```

## 🔐 Security Notes

- Use strong, environment-specific secrets. In non-development environments, `SECRET_KEY` must be at least 32 characters.
- Configure JWT claims via env:
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
- Auth and websocket endpoints are rate-limited with Redis; keep Redis available in all deployed environments.
- Refresh tokens are stored hashed in DB and rotated on refresh. Never log or persist raw refresh tokens in client logs.
- Access token TTL is short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES=15` by default). Use refresh flow for session continuity.
- Refresh policy is strict rotation: every successful refresh revokes the previous refresh token and issues a new pair.
- Error responses are intentionally sanitized in production paths; avoid adding stack traces to API responses.
- Admin operations are role-protected and auditable. Review audit logs regularly for suspicious actions.
- Dependency hygiene:
  - Run `npm audit` in repo root.
  - Run `pip-audit` in `apps/api`.
  - Patch high/critical CVEs before release.

For an actionable hardening checklist, see `docs/SECURITY_CHECKLIST.md`.

## 🚨 Secret Leak Incident Response

- Rotate secrets immediately:
  - `bash infra/scripts/rotate_secrets.sh`
- Revoke live sessions by revoking refresh tokens (global or user scoped):
  - `API_URL=http://localhost:8000 ADMIN_TOKEN=<admin_jwt> ADMIN_STEP_UP_TOKEN=<step_up_token> ADMIN_STEP_UP_TOTP=<6_digit_code> bash infra/scripts/security_incident_response.sh`
  - `API_URL=http://localhost:8000 ADMIN_TOKEN=<admin_jwt> ADMIN_STEP_UP_TOKEN=<step_up_token> ADMIN_STEP_UP_TOTP=<6_digit_code> bash infra/scripts/security_incident_response.sh <user_id>`
