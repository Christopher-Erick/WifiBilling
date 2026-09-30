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

`MPESA_PROVIDER=mock` is the default. The customer portal shows Paybill steps and **Complete demo payment**. Do not use mock in production (`NODE_ENV=production` refuses it).

## Compose

```bash
cp .env.example .env
# For a local demo you may leave MPESA_PROVIDER=mock and NODE_ENV=development.
docker compose up --build
```

Nginx publishes **43127**. App, worker, scheduler, Postgres, Redis, and FreeRADIUS start together. Health and ready are served through nginx:

- http://127.0.0.1:43127/api/v1/public/health
- http://127.0.0.1:43127/api/v1/public/ready

Run seed once:

```bash
docker compose exec app npx tsx prisma/seed.ts
```

Compose always sets `DATABASE_URL` and `REDIS_URL` to the `db` and `redis` services so a host URL in `.env` cannot break the stack.

## Environment

See `.env.example` for the local demo block and the **production checklist**. Secrets never belong in git. Compose reads `.env` via `env_file`. Do not commit `.env`.

You must set for production:

- `APP_URL` — public `https://` origin (CSRF and cookies)
- `MPESA_PAYBILL` — Paybill customers type
- `MPESA_PROVIDER=daraja` and `NODE_ENV=production`
- Strong `SESSION_SECRET`, `INTERNAL_API_TOKEN`, `POSTGRES_PASSWORD`
