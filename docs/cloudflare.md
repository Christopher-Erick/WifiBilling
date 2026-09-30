# Cloudflare

HTTPS belongs at the edge. LipaWiFi’s origin Nginx can terminate TLS as well (self-signed until you install an Origin CA certificate).

Set `APP_URL=https://<your-hostname>` in every case. Daraja callbacks must be that origin:

`https://<host>/api/v1/webhooks/mpesa/stk`

## Option A — Orange-cloud + origin Nginx on 443 (preferred)

1. Add an A/AAAA record for the hostname, **proxied** (orange cloud).
2. SSL/TLS mode **Full (strict)**.
3. Create a **Cloudflare Origin CA** certificate and install it in the Compose `nginxcerts` volume:

```bash
# on the server, after first `compose up` created the volume
docker compose cp fullchain.pem nginx:/etc/nginx/certs/fullchain.pem
docker compose cp privkey.pem nginx:/etc/nginx/certs/privkey.pem
docker compose exec nginx nginx -s reload
```

4. Lock the origin: allowlist Cloudflare IPs on the host firewall (or use Authenticated Origin Pulls). Until the origin is locked, **do not** trust `CF-Connecting-IP` from the public internet.
5. Leave `TRUST_PROXY=nginx`. Nginx sets `X-Real-IP` from `$remote_addr` (the CF edge, unless you enable `deploy/nginx/cloudflare-realip.conf` **after** the origin is locked).
6. Walled garden on MikroTik must include your hostname and `safaricom.co.ke`.

Do not publish host ports 3000, 5173, or 8080. Publish **80** and **443** only (`LIPAWIFI_HTTP_PORT=80`, `LIPAWIFI_HTTPS_PORT=443`).

## Option B — Cloudflare Tunnel

1. Install `cloudflared` on the host (or a Compose sidecar you add locally).
2. Tunnel hostname → `https://nginx:443` or `http://app:43127`.
3. You can close 80/443 on the public NIC.
4. If the app sees Cloudflare headers directly, set `TRUST_PROXY=cloudflare` (uses `CF-Connecting-IP`, and `X-Forwarded-For` only when `CF-Ray` is present). If Nginx sits in front of the app, keep `TRUST_PROXY=nginx`.

## What LipaWiFi will not do

- It will not treat `X-Forwarded-For` as the client IP when `TRUST_PROXY=none` (the `npm run dev` default).
- It will not enable Cloudflare `real_ip` by default, because that would trust spoofed `CF-Connecting-IP` on an open origin.

## Cookies and CSRF

- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` when `APP_URL` is `https://`
- Production mutating requests: `Origin` must match `APP_URL`
- Next.js server actions `allowedOrigins` includes the `APP_URL` host
