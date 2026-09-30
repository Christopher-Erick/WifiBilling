# Install

## Prerequisites

- Node.js 22
- PostgreSQL 16
- Redis 7
- FreeRADIUS 3.2 (production / Compose)
- A MikroTik with HotSpot (production)
- An M-Pesa Paybill shortcode linked to your Equity Bank account (production)

## Development

```bash
cp .env.example .env
# set DATABASE_URL, SESSION_SECRET, INTERNAL_API_TOKEN
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev          # 0.0.0.0:43127
npm run worker       # optional second terminal
```

Seeded operator: `admin@lipawifi.local` / `ChangeMe_Admin1!`  
Other roles: `finance@`, `support@`, `netops@`, `readonly@` (see `prisma/seed.ts`).

`MPESA_PROVIDER=mock` is the default. The customer portal **Pay with M-Pesa** sends a mock STK prompt and shows Paybill as a manual fallback plus **Complete demo payment**. Do not use mock in production (`NODE_ENV=production` refuses it).

## Compose

Local demo (nginx on **43127** via `LIPAWIFI_HTTP_PORT`):

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile seed up --build
```

Production (`NODE_ENV=production`, nginx **80/443**):

```bash
cp .env.production.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
docker compose --profile seed run --rm seed   # once
```

Health and ready go through nginx (`LIPAWIFI_HTTP_PORT`, default 80 in Compose, 43127 in `.env.example`):

- http://127.0.0.1:43127/api/v1/public/health
- http://127.0.0.1:43127/api/v1/public/ready

Compose always sets `DATABASE_URL` and `REDIS_URL` to the `db` and `redis` services so a host URL in `.env` cannot break the stack. The `migrate` service must complete before app / worker / scheduler / FreeRADIUS start.

## Environment

See `.env.example` for the local demo block and the **production checklist**. Secrets never belong in git. Compose reads `.env` via `env_file`. Do not commit `.env`.

You must set for production:

- `APP_URL` — public `https://` origin (CSRF and cookies)
- `MPESA_PAYBILL` — Paybill customers type
- `MPESA_PROVIDER=daraja` and `NODE_ENV=production`
- Strong `SESSION_SECRET`, `INTERNAL_API_TOKEN`, `POSTGRES_PASSWORD`
