# Troubleshooting

## STK never completes

- Mock: click **Complete demo payment** or set `MPESA_MOCK_AUTO_PAY=true` and wait ~3s (scheduler/query).
- Daraja: confirm callback URL is publicly reachable, shortcode/passkey match, and the phone is on the sandbox whitelist.
- Check `payments.status`, `resultDesc`, and `audit_logs`.

## Paid but not online

Open **Admin → Reconciliation → Paid, not activated** and **Retry activation**. Look at `failureReason`. RADIUS rows should appear in `radcheck` for `subscriptions.radiusUsername`.

## Activated but client still captive

**Activated, not confirmed** means RADIUS is written but the browser has not POSTed to `link-login-only`. Confirm walled garden, login.html host, and that `link-login-only` was preserved. Mark confirmed after a successful HotSpot login or use the portal **Connect me now** button.

## Wrong router

Payments bind to `mikrotik_devices`. If `identity` / NAS identifier in the query string does not match a device, LipaWiFi falls back to the oldest active device — register the router first.

## Admin 403

Role is enforced server-side. `READ_ONLY` cannot POST packages. `FINANCE` can retry activation, not edit routers.

## Ready endpoint 503

Postgres is down or `DATABASE_URL` is wrong. Redis being down is reported but does not fail readiness (rate-limit falls back to memory).

## Duplicate M-Pesa SMS, one session

That is intended. Callbacks are idempotent on `CheckoutRequestID` / `TransID`.
