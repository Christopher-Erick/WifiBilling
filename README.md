# LipaWiFi

Open-source **Wi-Fi billing** for Kenya. Customers pick a package and **Pay with M-Pesa** (STK Push). Money settles to the **Equity Bank account** linked to your Safaricom Paybill. Manual Paybill (number + account + amount) stays on screen as a fallback. Expiry takes access away.

This is not daloRADIUS and not a single-router appliance. Every payment belongs to a registered site.

## Local demo (this environment)

```bash
cp .env.example .env   # already done in development
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev            # http://127.0.0.1:43127
```

In another terminal:

```bash
npm run worker
```

- Customer portal: [http://127.0.0.1:43127/portal](http://127.0.0.1:43127/portal)
- Admin: [http://127.0.0.1:43127/admin/login](http://127.0.0.1:43127/admin/login)
- Health: [http://127.0.0.1:43127/api/v1/public/health](http://127.0.0.1:43127/api/v1/public/health)

**Demo operator:** `admin@lipawifi.local` / `ChangeMe_Admin1!`  
**M-Pesa:** `MPESA_PROVIDER=mock` — **Pay with M-Pesa**, then **Complete demo payment** on the status screen. Paybill details stay visible. No real money moves.

## Docker Compose

```bash
cp .env.example .env
# local demo: leave MPESA_PROVIDER=mock
# production: NODE_ENV=production, MPESA_PROVIDER=daraja, APP_URL=https://…, MPESA_PAYBILL=…
docker compose up --build
```

Web UI: **port 43127**. Health and ready go through nginx. Seed once:

```bash
docker compose exec app npx tsx prisma/seed.ts
```

Cloudflare Tunnel (optional): set `CLOUDFLARE_TUNNEL_TOKEN` and `docker compose --profile cloudflare up -d`.

## Tests

```bash
npm test
```

Coverage includes Kenyan phones, the payment state machine, Paybill C2B confirm/duplicate/amount-mismatch, STK duplicate/amount mismatch, EXTEND vs QUEUE, expiry, and RBAC.

## Docs

- [Architecture](docs/architecture.md)
- [Install](docs/install.md)
- [MikroTik](docs/mikrotik.md)
- [FreeRADIUS](docs/freeradius.md)
- [M-Pesa Paybill](docs/mpesa.md)
- [Deployment](docs/deployment.md)
- [Backup](docs/backup.md)
- [Troubleshooting](docs/troubleshooting.md)
- [OpenAPI](docs/openapi.yaml)

## License

MIT
