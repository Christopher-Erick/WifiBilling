import { getEnv, mpesaPaybillShortcode } from "@/lib/env";
import type { MpesaProvider, StkPushInput, StkPushResult, StkQueryResult } from "@/lib/mpesa/types";
import { createLogger } from "@/lib/logger";

const log = createLogger();

function baseUrl() {
  return getEnv().MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function password(shortcode: string, passkey: string, ts: string) {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

let cachedToken: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  const env = getEnv();
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.token;
  const basic = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    const text = await res.text();
    log.error({ status: res.status, text }, "daraja token failed");
    throw new Error("Unable to authenticate with Daraja");
  }
  const body = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = { token: body.access_token, exp: Date.now() + Number(body.expires_in) * 1000 };
  return cachedToken.token;
}

export const darajaProvider: MpesaProvider = {
  name: "daraja",
  async stkPush(input: StkPushInput): Promise<StkPushResult> {
    const env = getEnv();
    const shortcode = mpesaPaybillShortcode();
    const ts = timestamp();
    const token = await accessToken();
    const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password(shortcode, env.MPESA_PASSKEY, ts),
        Timestamp: ts,
        // Lipa Na M-Pesa Online against the Safaricom Paybill (linked to Equity at Safaricom).
        // Do not use CustomerBuyGoodsOnline. There is no separate Equity Bank API.
        TransactionType: "CustomerPayBillOnline",
        Amount: input.amountKes,
        PartyA: input.phone,
        PartyB: shortcode,
        PhoneNumber: input.phone,
        CallBackURL: input.callbackUrl,
        AccountReference: input.accountReference.slice(0, 12),
        TransactionDesc: input.transactionDesc.slice(0, 13),
      }),
    });
    const body = (await res.json()) as Record<string, string>;
    if (!res.ok || body.ResponseCode !== "0") {
      log.warn({ body }, "stk push rejected");
      throw new Error(body.errorMessage || body.ResponseDescription || "STK Push failed");
    }
    return {
      merchantRequestId: body.MerchantRequestID,
      checkoutRequestId: body.CheckoutRequestID,
      responseCode: body.ResponseCode,
      responseDescription: body.ResponseDescription,
      customerMessage: body.CustomerMessage,
    };
  },
  async queryStk(checkoutRequestId: string): Promise<StkQueryResult> {
    const env = getEnv();
    const shortcode = mpesaPaybillShortcode();
    const ts = timestamp();
    const token = await accessToken();
    const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password(shortcode, env.MPESA_PASSKEY, ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
    const body = (await res.json()) as Record<string, string>;
    return {
      resultCode: body.ResultCode ?? body.errorCode ?? "1",
      resultDesc: body.ResultDesc ?? body.errorMessage ?? "Query failed",
      merchantRequestId: body.MerchantRequestID,
      checkoutRequestId: body.CheckoutRequestID,
    };
  },
};
