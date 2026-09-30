# Architecture

LipaWiFi is a Next.js App Router application plus Node worker/scheduler processes. PostgreSQL is the ledger and the FreeRADIUS SQL backend. Redis is used for STK rate limits and scheduler locks.

## Processes

| Process | Port / trigger | Responsibility |
|---|---|---|
| Web (Next.js) | **43127** | Captive portal, admin UI, `/api/v1/*` |
| Worker | interval 15s | Activation retry, same jobs as scheduler |
| Scheduler | interval 30s | Expiry, STK query, paid-not-activated retry |
| PostgreSQL | 5432 | App tables + `nas`/`radcheck`/`radreply`/`radacct` |
| Redis | 6379 | Rate limit + locks |
| FreeRADIUS | 1812/1813 UDP | Auth/acct for every MikroTik NAS |
| Nginx | **80/443** (`LIPAWIFI_HTTP_PORT` locally) | Reverse proxy, TLS, Docker DNS resolver |

## Request path

1. MikroTik HotSpot redirects the client to `/portal` with `mac`, `ip`, `chap-id`, `chap-challenge`, `link-login-only`, `dst`, `identity`, …
2. Customer selects a package and enters a Kenyan MSISDN (stored as `254XXXXXXXXX`).
3. `POST /api/v1/customer/payments` (default `method=stk`) creates the order with account reference `LW…` and sends STK Push to the Paybill shortcode.
4. Portal shows **Pay with M-Pesa** (PIN prompt) and **or pay manually** (Paybill number + account + amount). Typed references are not payment.
5. Safaricom calls `POST /api/v1/webhooks/mpesa/stk` or `…/c2b/confirmation`. Duplicates are no-ops.
6. On verified amount, status becomes `PAID` → `ACTIVATING` → `ACTIVATED`. Access is written for the **site that owns the session**.
7. Portal shows **Connect me now** (posts to the router login URL when present).
8. Scheduler expires `ACTIVE` subscriptions past `expires_at`, deletes access rows, and promotes `QUEUED` subs.

## Multi-router

`mikrotik_devices` is required on payments and subscriptions. NAS clients are synced into FreeRADIUS `nas`. There is no global “the router”.

## API split

- `/api/v1/public` — health, ready, packages, OpenAPI
- `/api/v1/customer` — STK initiate (Paybill fallback on the same order), poll, confirm access
- `/api/v1/admin` — RBAC session cookie
- `/api/v1/internal` — worker token
- `/api/v1/webhooks` — Daraja STK + C2B

Roles: `SUPER_ADMIN`, `ADMIN`, `FINANCE`, `SUPPORT`, `NETWORK_OPERATOR`, `READ_ONLY`. Enforced in route handlers, not only in the UI.

Audit logs are append-only (`audit_logs`). Payments are a state machine, never a `paid` boolean.

## Out of scope

daloRADIUS is not used. It would duplicate RADIUS user tables and fight this payment machine.
