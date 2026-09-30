# Deployment

## Recommended topology

Internet → Cloudflare (HTTPS, orange cloud or Tunnel) → Nginx :43127 → Next.js  
MikroTik NAS → FreeRADIUS :1812/1813 → Postgres  
Workers on the same Compose namespace as the app.

## Production checklist

1. Copy `.env.example` → `.env` (never commit `.env`)
2. Strong `SESSION_SECRET` and `INTERNAL_API_TOKEN` (`openssl rand -hex 32`)
3. Strong `POSTGRES_PASSWORD`
4. `NODE_ENV=production`, `MPESA_PROVIDER=daraja` (mock is refused)
5. `APP_URL` equals the public origin, e.g. `https://wifi.example.com` (CSRF Origin check)
6. `MPESA_PAYBILL` (and usually `MPESA_SHORTCODE`) = the live Paybill that settles to Equity
7. Daraja confirmation URL: `https://<APP_URL host>/api/v1/webhooks/mpesa/c2b/confirmation`
8. Postgres backups scheduled
9. Each router has its own RADIUS secret
10. TLS at Cloudflare; origin may be HTTP on 43127 if you use a Tunnel or Flexible/Full as documented below

## Cloudflare

**Option A — named Tunnel (recommended)**

1. Create a Cloudflare Tunnel and a public hostname → `http://nginx:43127` (or the Compose host).
2. Put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
3. `docker compose --profile cloudflare up -d --build`
4. Set `APP_URL=https://your-hostname` (must match the browser origin).

**Option B — orange-cloud DNS**

1. A/AAAA (or CNAME) to the VPS, proxied (orange cloud).
2. SSL/TLS: **Full** if nginx has TLS; if nginx is HTTP-only on 43127, use a Tunnel instead of exposing HTTP on the internet.
3. Set `APP_URL` to the public `https://` hostname. Admin POST and cookies require this match.
4. Walled garden on the router must include that hostname plus `safaricom.co.ke`.

Nginx re-resolves the `app` container via Docker DNS (`127.0.0.11`) so recreating `app` does not 502.

## Health

Through nginx on port **43127**:

- Liveness: `GET /api/v1/public/health`
- Readiness: `GET /api/v1/public/ready` (Postgres required; Redis reported)

## Images

`Dockerfile` builds Next.js `output: "standalone"` plus Prisma client. Worker/scheduler reuse the image with `npx tsx src/jobs/*.ts`. FreeRADIUS is a small image under `deploy/freeradius` that enables SQL against the same Postgres.

Do not publish 3000/5173/8080. Compose binds **43127**.
