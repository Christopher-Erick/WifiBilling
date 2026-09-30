# MikroTik HotSpot

LipaWiFi never assumes a single router. Create one `mikrotik_devices` row per NAS (Admin → Routers).

## Walled garden

Allow the portal host, Safaricom Daraja, and DNS:

```
/ip hotspot walled-garden
add dst-host=lipawifi.example.com
add dst-host=*.safaricom.co.ke
add dst-host=sandbox.safaricom.co.ke
```

## RADIUS client

```
/radius
add address=RADIUS_HOST secret=PER_DEVICE_SECRET service=hotspot authentication-port=1812 accounting-port=1813
/ip hotspot profile set [find] use-radius=yes radius-accounting=yes login-by=http-pap,http-chap
```

Use the **same secret** stored on that device in LipaWiFi. `nasIdentifier` should match `/system identity` or the HotSpot `identity` query param so the portal can pick the right device.

## External login page

Copy `deploy/mikrotik/login.html` to `/hotspot/login.html` on the router. Replace `WIFI_PORTAL_HOST` with your LipaWiFi host (include the path `/portal`).

The template forwards:

`mac`, `ip`, `username`, `link-login`, `link-login-only`, `link-orig`, `chap-id`, `chap-challenge`, `error`, `dst`, `server`, `identity`, `mac-esc`

LipaWiFi stores that snapshot on the payment and, after STK success, POSTs `username` / `password` back to `link-login-only`. If `chap-id` is present, the browser sends `MD5(chap-id + password + chap-challenge)`.

Prefer **HTTP-PAP** plus RADIUS so the router forwards the clear password to FreeRADIUS. Keep CHAP support for older HotSpot profiles.

## CoA / disconnect

Session-Timeout and Expiration are the primary revoke mechanism. RouterOS API disconnect is adapter-shaped (`src/lib/mikrotik.ts`) and safe to replace with a real API client per device host. A paid session must never depend on API success — activation failure lands in reconciliation.

## Script sketch

```
/ip hotspot setup
# LAN interface, address 10.5.50.1/24, pool, dns, etc.
/system identity set name=westlands-cafe
```

Register that identity in LipaWiFi as `nasIdentifier`.
