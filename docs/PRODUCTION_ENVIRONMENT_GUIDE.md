# Production Environment Guide

## Backend required variables

- `ENVIRONMENT=production`
- `SECRET_KEY=<min-32-char-random-secret>`
- `ALGORITHM=HS256`
- `JWT_ISSUER=marketpulse-api`
- `JWT_AUDIENCE=marketpulse-clients`
- `DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>`
- `REDIS_URL=redis://<host>:6379/0`
- `SENTRY_DSN=<your-sentry-dsn>`
- `SENTRY_RELEASE=<git-sha-or-version>`
- `SENTRY_TRACES_SAMPLE_RATE=0.1`
- `ACCESS_TOKEN_EXPIRE_MINUTES=15` (recommended for prod)
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30`
- `AUTH_RATE_LIMIT_MAX_REQUESTS=20`
- `AUTH_RATE_LIMIT_WINDOW_SECONDS=60`
- `WS_CONNECT_RATE_LIMIT_MAX_REQUESTS=30`
- `WS_CONNECT_RATE_LIMIT_WINDOW_SECONDS=60`
- `PRICE_POLL_INTERVAL_SECONDS=5`
- `PRICE_HTTP_TIMEOUT_SECONDS=8.0`
- `PRICE_PROVIDER_MAX_RETRIES=2`
- `PRICE_PROVIDER_RETRY_BACKOFF_SECONDS=0.4`
- `PRICE_SYMBOLS=BTC,ETH,SOL,ADA,XRP,BNB,DOGE,USDTRY,EURUSD,GBPUSD,USDJPY,USDCHF,USDCAD,USDAUD,USDNZD,USDSEK,USDNOK,USDDKK,USDCNH,USDRUB,USDZAR,USDMXN,USDBRL,USDINR,USDKRW,USDHKD,USDSGD,USDPLN,USDCZK,USDHUF,USDILS,USDAED,USDSAR,USDQAR,USDKWD,USDBHD,USDOMR,USDTHB,USDMYR,USDIDR,USDPHP,USDVND,XAU,XAG,XPT,XPD`

## Admin required variables

- `VITE_API_URL=https://api.<your-domain>`

## Mobile required variables

- `EXPO_PUBLIC_API_URL=https://api.<your-domain>`
- `EXPO_PUBLIC_WS_URL=wss://api.<your-domain>/api/v1/ws/`

## Secret management recommendations

- Store secrets only in your cloud secret manager (AWS Secrets Manager, GCP Secret Manager, Doppler, Vault).
- Never commit `.env` files.
- Rotate `SECRET_KEY` and DB credentials periodically.
- Use different secrets per environment.

## Operational hardening

- Put API and admin behind TLS terminator (Nginx/ALB/Cloudflare).
- Restrict database and Redis network access to private subnets/security groups.
- Enable DB backups and PITR.
- Enable centralized logs and alerts for auth failures, rate-limit spikes, and 5xx errors.
