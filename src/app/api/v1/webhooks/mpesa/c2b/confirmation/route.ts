import { prisma } from "@/lib/db";
import { applyC2bConfirmation } from "@/lib/payments/service";
import { errorResponse, json, requestIdFrom, assertWebhookAllowed } from "@/lib/http";
import type { C2bConfirmation } from "@/lib/mpesa/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertWebhookAllowed(req);
    const payload = (await req.json()) as C2bConfirmation;
    const result = await applyC2bConfirmation(prisma, payload, requestId);
    return json({ ResultCode: 0, ResultDesc: "Accepted", ...result, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
