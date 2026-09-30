import { prisma } from "@/lib/db";
import { applyStkCallback } from "@/lib/payments/service";
import { errorResponse, json, requestIdFrom, assertWebhookAllowed } from "@/lib/http";
import { createLogger } from "@/lib/logger";
import type { StkCallback } from "@/lib/mpesa/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const log = createLogger(requestId);
  try {
    assertWebhookAllowed(req);
    const payload = (await req.json()) as StkCallback;
    log.info({ checkout: payload.Body?.stkCallback?.CheckoutRequestID }, "stk callback received");
    const result = await applyStkCallback(prisma, payload, requestId);
    return json({ ResultCode: 0, ResultDesc: "Accepted", ...result, requestId }, { requestId });
  } catch (err) {
    log.warn({ err }, "stk callback error");
    // Daraja retries on non-200. Unknown IDs still 200 to avoid poison retries
    // after we persist what we can.
    return errorResponse(err, requestId);
  }
}
