# M-Pesa (Daraja)

Preferred path: **Lipa Na M-Pesa Online (STK Push)** `CustomerPayBillOnline`.  
Second path: **C2B Paybill** confirmation webhook.

## Environments

| `MPESA_PROVIDER` | `MPESA_ENV` | Behaviour |
|---|---|---|
| `mock` | any | No Safaricom calls. Portal “Complete demo payment”. Auto-query can complete after ~2.5s if `MPESA_MOCK_AUTO_PAY=true`. **Rejected when `NODE_ENV=production`.** |
| `daraja` | `sandbox` | `https://sandbox.safaricom.co.ke` |
| `daraja` | `production` | `https://api.safaricom.co.ke` |

## STK Push

`src/lib/mpesa/daraja.ts` implements OAuth, password (`base64(shortcode+passkey+timestamp)`), processrequest, and stkpushquery.

Callback URL: `POST /api/v1/webhooks/mpesa/stk`

Idempotency key: `CheckoutRequestID` unique on `payments`. Duplicate PAID callbacks return 200 and do not double-activate.

Amount and MSISDN in callback metadata must match the payment row or the payment is `FAILED` (amount mismatch) — no RADIUS.

## Paybill C2B

- Validation: `POST /api/v1/webhooks/mpesa/c2b/validation` (always accept)
- Confirmation: `POST /api/v1/webhooks/mpesa/c2b/confirmation`

`TransID` is unique. Matching is by pending payment for that MSISDN+amount, or account reference `WIFI` + payment suffix.

## Secrets

`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` live only in env / a secrets manager. Never commit them.
