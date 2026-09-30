# LipaWiFi

Open-source **MikroTik HotSpot billing** for Kenya. Customers pick a package, pay with **M-Pesa STK Push** (Paybill C2B is also supported), and receive **FreeRADIUS** credentials. Expiry revokes access.

This is not daloRADIUS and not a single-router appliance. Every payment and subscription belongs to a `mikrotik_devices` row.

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
**M-Pesa:** `MPESA_PROVIDER=mock` — use **Complete demo payment** (or wait a few seconds if auto-pay is on). No real money moves.

Captive-portal query string is preserved. Example:

```
http://127.0.0.1:43127/portal?mac=4C:5E:0C:11:22:33&ip=10.5.50.20&link-login-only=http://10.5.50.1/login&identity=westlands-cafe
```

## Docker Compose (production-shaped)

```bash
cp .env.example .env
# set SESSION_SECRET, INTERNAL_API_TOKEN, DATABASE_URL, POSTGRES_PASSWORD
docker compose up --build
```

Services: `app`, `db`, `redis`, `freeradius`, `worker`, `scheduler`, `nginx`, `migrate`.

The web UI is bound to **port 43127** (not 3000 / 5173 / 8080).

## Tests

```bash
npm test
```

Coverage includes Kenyan phone normalization, the payment state machine, duplicate STK callbacks, amount mismatch, EXTEND vs QUEUE, expiry RADIUS revoke, and RBAC.

## Docs

- [Architecture](docs/architecture.md)
- [Install](docs/install.md)
- [MikroTik](docs/mikrotik.md)
- [FreeRADIUS](docs/freeradius.md)
- [M-Pesa](docs/mpesa.md)
- [Deployment](docs/deployment.md)
- [Backup](docs/backup.md)
- [Troubleshooting](docs/troubleshooting.md)
- [OpenAPI](docs/openapi.yaml)

## License

MIT
