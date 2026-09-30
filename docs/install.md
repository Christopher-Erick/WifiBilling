# Install

## Prerequisites

- Node.js 22
- PostgreSQL 16
- Redis 7
- FreeRADIUS 3.2 (production / compose)
- A MikroTik with HotSpot (production)

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

`MPESA_PROVIDER=mock` is the default. Do not use mock in production (`NODE_ENV=production` refuses it).

## Compose

```bash
cp .env.example .env
docker compose up --build
```

Nginx publishes **43127**. App, worker, scheduler, Postgres, Redis, and FreeRADIUS start together. Run seed once:

```bash
docker compose exec app npx tsx prisma/seed.ts
```

## Environment

See `.env.example`. Secrets never belong in git. Compose reads `.env` via `env_file`.
