# M-Pesa Paybill (Daraja)

LipaWiFi takes **Lipa na M-Pesa Paybill (C2B)** as the first-class customer path. Safaricom settles that Paybill to the **Equity Bank account linked to the shortcode** when you registered it. LipaWiFi never holds bank credentials and **never treats a typed account number as paid**.

Optional **STK Push** (`CustomerPayBillOnline`) is a faster path when Daraja STK is configured.

## Environments

| `MPESA_PROVIDER` | `MPESA_ENV` | Behaviour |
|---|---|---|
| `mock` | any | No Safaricom calls. Portal shows Paybill steps and **Complete demo payment**. **Rejected when `NODE_ENV=production`.** |
| `daraja` | `sandbox` | `https://sandbox.safaricom.co.ke` |
| `daraja` | `production` | `https://api.safaricom.co.ke` |

Production must use `MPESA_PROVIDER=daraja` and `NODE_ENV=production`. Do not invent live credentials — set them in `.env` and Admin → Settings.

## Paybill C2B (default)

Configure:

- `MPESA_PAYBILL` — the business number customers type (often the same as `MPESA_SHORTCODE`)
- Admin → Settings → **M-Pesa Paybill number** (shown on the portal)
- Daraja C2B URLs (public HTTPS origin):
  - Validation: `POST /api/v1/webhooks/mpesa/c2b/validation` (always accept)
  - Confirmation: `POST /api/v1/webhooks/mpesa/c2b/confirmation`

Each order gets an account reference `LW` + 8 characters (no 0/O/1/I). That value is stored on `payments.accountReference` and is what the customer enters as **Account**. Confirmation matching is **BillRefNumber = account reference**. A random or mistyped reference does not mark any order paid.

`TransID` is unique on `payments.mpesaReceipt`. Duplicate confirmations return 200 and do not double-activate.

If the confirmed amount does not match the package price, the payment is `FAILED` (amount mismatch) and no access is granted.

Register the confirmation URL in the Daraja portal against the Paybill shortcode. After Safaricom confirms, money is already on the Paybill; unmatched receipts are audited for the operator (`payment.c2b_unmatched`).

## STK Push (optional)

Set `MPESA_STK_ENABLED=true` and keep Daraja consumer key/secret/passkey. The portal button **Send M-Pesa prompt to my phone** calls `POST /api/v1/customer/payments/{id}/stk`.

Callback URL: `POST /api/v1/webhooks/mpesa/stk`

Idempotency: `CheckoutRequestID` unique. Amount mismatch fails the payment; no access.

If the customer cancels the prompt they can still pay the same order with Paybill.

## Mock (local demo only)

`MPESA_PROVIDER=mock` shows Paybill number, account, and amount plus **Complete demo payment**, which posts a fake C2B confirmation. No real money moves.

## Secrets

`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` live only in env / a secrets manager. Never commit them. Never put live Daraja values in git.
