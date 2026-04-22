# Runbook (Deploy + Operations)

## Local full stack run

1. Copy env template:
   - `cp infra/.env.example infra/.env`
2. Start stack:
   - `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build`
3. Verify:
   - API: `http://localhost:8000/`
   - Admin: `http://localhost:5173`

## Backend deployment notes

1. Build image:
   - `docker build -t marketpulse-api:latest apps/api`
   - publish image to ECR repository output: `api_ecr_repository_url`
2. Run migrations:
   - `DATABASE_URL=<db-url> cd apps/api && alembic upgrade head`
3. Deploy service with env from secret manager.
4. Health check endpoint:
   - `GET /`
   - `GET /api/v1/health/readiness`
5. Rollback:
   - run concrete rollback commands via:
   - `ENVIRONMENT=staging ROLLBACK_API_CMD="<platform api rollback>" ROLLBACK_ADMIN_CMD="<platform admin rollback>" API_BASE_URL=https://api.<your-domain> bash infra/scripts/rollback_release.sh`
6. Post-deploy smoke:
   - `bash infra/scripts/post_deploy_smoke.sh https://api.<your-domain>`
7. Release gate check:
   - `API_BASE_URL=https://api.<your-domain> RELEASE_GATE_ADMIN_TOKEN=<token> python3 infra/scripts/release_gate_check.py`

## Admin deployment notes

1. Build image:
   - `docker build -t marketpulse-admin:latest -f apps/admin/Dockerfile .`
   - publish image to ECR repository output: `admin_ecr_repository_url`
2. Set `VITE_API_URL` at build time/environment policy level.
3. Serve via Nginx/CDN with cache headers for static assets.
4. Rollback:
   - redeploy previous image tag.

## Mobile build guide

### Android
- `cd apps/mobile`
- `npx expo prebuild`
- `eas build --platform android --profile production`

### iOS
- `cd apps/mobile`
- `npx expo prebuild`
- `eas build --platform ios --profile production`

### Release
- Configure store metadata, privacy labels, and crash reporting before submit.

## Incident quick actions

- Auth failures spike:
  - inspect rate-limit Redis keys and auth logs
  - verify JWT issuer/audience mismatch in env
- API unhealthy:
  - check DB/Redis health and container logs
- Admin blank screen:
  - verify `VITE_API_URL` and API CORS configuration

## Staged deploy and rollback flow

1. Deploy staging via CI environment `staging`.
2. Run smoke and release gate checks.
3. Confirm Terraform runtime outputs:
   - `alb_dns_name`
   - `ecs_cluster_name`
   - `vpc_id`
4. Promote to `production` environment gate.
5. If failure detected:
   - execute rollback via `ROLLBACK_API_CMD` and `ROLLBACK_ADMIN_CMD` secrets
   - rerun smoke and release gate checks

## Terraform production profile flags

- Baseline:
  - `api_image`, `admin_image`
  - `api_desired_count`, `admin_desired_count`
- Security/perimeter:
  - `acm_certificate_arn` (enables HTTPS listener)
  - `enable_waf=true`
- Database:
  - `enable_rds=true`
  - `db_name`, `db_username`, `db_instance_class`
  - `db_backup_window`, `db_maintenance_window`
  - RDS master password is managed in Secrets Manager (see `rds_master_user_secret_arn` output)
  - Optional performance tuning via `db_performance_insights_enabled`

## Local Terraform validation

- Run local checks before pushing infra changes:
  - `npm run infra:validate`

## Incident playbook (P1/P0)

1. Confirm impact (`/api/v1/health`, `/api/v1/health/readiness`, mobile login, websocket price stream).
2. Freeze deployment pipeline and announce incident owner.
3. Collect evidence:
   - API logs (request_id, status, latency)
   - Redis connectivity/status
   - DB connectivity/status
   - provider health (binance/yahoo) from health endpoint
4. Mitigate:
   - roll back to previous stable image tag if regression suspected
   - if provider outage, keep service live with cached/stale path and communicate degraded mode
5. Recover:
   - validate readiness endpoint returns `ready: true`
   - run post-recovery smoke (`login`, `prices`, `ws`)
6. Postmortem:
   - root cause, blast radius, time to detect/recover, action items

## Release signoff (App Store candidate)

- [ ] Backend tests pass in CI
- [ ] API readiness smoke passes in CI
- [ ] Mobile tests pass in CI
- [ ] Docker image builds succeed
- [ ] `SENTRY_DSN` configured in production environment
- [ ] Secrets rotated and loaded from secret manager
- [ ] `/api/v1/health/readiness` is green in staging and production
- [ ] Manual smoke run completed:
  - [ ] register/login/refresh/logout
  - [ ] prices + websocket updates
  - [ ] buy/sell transaction flow
  - [ ] portfolio and insights rendering

## Post-deploy verification checklist

- [ ] API root responds 200
- [ ] Admin UI loads and auth flow works
- [ ] Login/refresh/logout audit events appear
- [ ] WebSocket subscribe receives updates
- [ ] Rate limiting triggers correctly on abuse tests
- [ ] Release gate passes (`slo` + `coach conversion` thresholds)
- [ ] Incident playbook automation dry run:
  - `INCIDENT_TYPE=security API_URL=https://api.<your-domain> ADMIN_TOKEN=... ADMIN_STEP_UP_TOKEN=... ADMIN_STEP_UP_TOTP=... bash infra/scripts/run_incident_playbook.sh`
