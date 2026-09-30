# Troubleshooting

## Paybill paid but portal still waiting

Wi-Fi turns on only after Safaricom calls `POST /api/v1/webhooks/mpesa/c2b/confirmation`. Typing the account number on the portal does not pay.

- Confirm `APP_URL` is the public HTTPS origin and the confirmation URL is registered in Daraja.
- `BillRefNumber` must match `payments.accountReference` (the `LW…` value on the status screen).
- Amount must match the package exactly.
- Check `audit_logs` for `payment.c2b_unmatched` or `payment.amount_mismatch`.
- Duplicate M-Pesa SMS with one session is intended (`TransID` idempotency).

## STK never completes

- Mock: click **Complete demo payment** on the Paybill screen.
- Daraja: callback URL publicly reachable, shortcode/passkey match, phone on the sandbox whitelist.
- Customer can still pay the same order with Paybill if the prompt is cancelled.
- Check `payments.status`, `resultDesc`, and `audit_logs`.

## Paid but not online

Open **Admin → Reconciliation → Paid, not activated** and **Retry activation**. Look at `failureReason`.

## Activated but client still captive

The browser has not posted credentials to the router login URL. Confirm the walled garden includes your public hostname and that the original login link was preserved. Use **Connect me now** on the success screen.

## Wrong site

Payments bind to a registered Wi-Fi site. If the router identity in the URL does not match, LipaWiFi falls back to the oldest active site — register the router first.

## Admin 403 / sign-in does nothing in production

Set `APP_URL` to the exact public origin (scheme + host) customers and operators use. Production CSRF checks `Origin` against `APP_URL`.

## Ready endpoint 503

Postgres is down or `DATABASE_URL` is wrong. Redis being down is reported but does not fail readiness.

## Nginx 502 after recreating `app`

Nginx must use Docker DNS (`resolver 127.0.0.11`) so `app` is re-resolved. That is the shipped `deploy/nginx/nginx.conf`. Do not switch back to a static `upstream` hostname.

## FreeRADIUS restart loop

The stock image command `["-f", "-l", "stdout"]` is invalid (it never starts `radiusd`). Use the image built from `deploy/freeradius`. The SQL module is enabled there and waits for `migrate` so `nas` / `radcheck` tables exist. Check `docker compose logs freeradius`.

## Compose cannot reach Postgres / Redis

Compose overrides `DATABASE_URL` and `REDIS_URL` to `db` and `redis`. A host URL in `.env` is ignored inside those containers.
