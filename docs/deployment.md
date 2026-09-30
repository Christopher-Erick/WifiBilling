# Deployment

## Recommended topology

Internet → Cloudflare (HTTPS, orange cloud or Tunnel) → origin Nginx **:80/:443** → Next.js `:43127` (not published on the host)  
MikroTik NAS → FreeRADIUS :1812/1813 → Postgres  
Workers on the same Compose namespace as the app.

Do **not** publish 3000, 5173, or 8080. Local demo maps `LIPAWIFI_HTTP_PORT=43127` → container 80.

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
10. TLS at Cloudflare Full (strict) with an Origin CA cert in the `nginxcerts` volume, or a Tunnel (see [cloudflare.md](cloudflare.md))
11. `TRUST_PROXY=nginx` behind Compose Nginx. Do not blindly trust `X-Forwarded-*`.

Production overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

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

Through nginx (`LIPAWIFI_HTTP_PORT`, **80/443** in production, **43127** in `.env.example`):

- Liveness: `GET /api/v1/public/health`
- Readiness: `GET /api/v1/public/ready` (Postgres required; Redis reported)

## Images

`Dockerfile` builds Next.js `output: "standalone"` plus Prisma client, with an image healthcheck on `/api/v1/public/health`. Worker/scheduler reuse the image with `/app/node_modules/.bin/tsx`. FreeRADIUS is the Debian image under `deploy/freeradius` (configs copied in).

Do not publish 3000/5173/8080. Compose publishes **80/443** (or `LIPAWIFI_HTTP_PORT`).
