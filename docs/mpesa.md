# M-Pesa (Daraja)

The customer path is **Lipa Na M-Pesa Online (STK Push)** `CustomerPayBillOnline` against the **same Paybill shortcode** (`MPESA_PAYBILL`, else `MPESA_SHORTCODE`). Safaricom settles that Paybill to the **Equity Bank account linked to the shortcode**. LipaWiFi never holds bank credentials.

The portal **Pay with M-Pesa** button sends the PIN prompt. Paybill number, account (`LW…`), and amount stay visible as **or pay manually**. Typed account numbers are **not** paid.

## Environments

| `MPESA_PROVIDER` | `MPESA_ENV` | Behaviour |
|---|---|---|
| `mock` | any | No Safaricom calls. Portal sends a mock STK, shows Paybill fallback, and **Complete demo payment**. **Rejected when `NODE_ENV=production`.** |
| `daraja` | `sandbox` | `https://sandbox.safaricom.co.ke` |
| `daraja` | `production` | `https://api.safaricom.co.ke` |

Production must use `MPESA_PROVIDER=daraja` and `NODE_ENV=production`. Do not invent live credentials — set them in `.env` and Admin → Settings.

## STK Push (primary)

`src/lib/mpesa/daraja.ts` uses `MPESA_PAYBILL` (fallback `MPESA_SHORTCODE`) for `BusinessShortCode` and `PartyB`.

Callback URL: `POST /api/v1/webhooks/mpesa/stk`

Idempotency: `CheckoutRequestID` unique on `payments`. Duplicate PAID callbacks return 200 and do not double-activate.

Amount mismatch fails the payment — no access. If the customer cancels the prompt they can still pay the same order with Paybill.

## Paybill C2B (manual fallback)

Configure:

- `MPESA_PAYBILL` — shortcode for STK **and** the number customers type
- Admin → Settings → **M-Pesa Paybill number**
- Daraja C2B URLs (public HTTPS origin):
  - Validation: `POST /api/v1/webhooks/mpesa/c2b/validation` (always accept)
  - Confirmation: `POST /api/v1/webhooks/mpesa/c2b/confirmation`

Each order gets `payments.accountReference` (`LW` + 8 characters). Confirmation matching is **BillRefNumber = account reference**. A random or mistyped reference does not mark any order paid.

`TransID` is unique. Duplicate confirmations return 200. Amount mismatch → `FAILED`, no access.

## Mock (local demo only)

`MPESA_PROVIDER=mock` still shows **Complete demo payment** on the status screen. No real money moves.

## Secrets

`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` live only in env / a secrets manager. Never commit them. Never put live Daraja values in git.
