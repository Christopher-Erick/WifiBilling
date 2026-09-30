# Deployment

## Recommended topology

Internet → Nginx (TLS) → Next.js :43127  
MikroTik NAS → FreeRADIUS :1812/1813 → Postgres  
Workers on the same Compose/K8s namespace as the app.

## Checklist

1. Strong `SESSION_SECRET` and `INTERNAL_API_TOKEN`
2. `NODE_ENV=production`, `MPESA_PROVIDER=daraja`
3. `APP_URL` equals the public origin (CSRF Origin check)
4. Postgres backups scheduled
5. Each router has its own RADIUS secret
6. TLS on the captive portal host (HotSpot http-chap vs PAP — see MikroTik doc)
7. Restrict Daraja callbacks at Nginx if you set `MPESA_WEBHOOK_CIDRS` operationally

## Health

- Liveness: `GET /api/v1/public/health`
- Readiness: `GET /api/v1/public/ready` (Postgres required; Redis reported)

## Images

`Dockerfile` builds Next.js `output: "standalone"` plus Prisma client. Worker/scheduler reuse the image with `npx tsx src/jobs/*.ts`.

Do not publish 3000/5173/8080. Compose binds **43127**.
