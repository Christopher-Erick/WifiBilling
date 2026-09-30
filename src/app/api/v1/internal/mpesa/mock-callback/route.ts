import { z } from "zod";
import { prisma } from "@/lib/db";
import { isMockMpesa } from "@/lib/env";
import { applyStkCallback, mockSuccessCallback } from "@/lib/payments/service";
import { errorResponse, json, requestIdFrom, requireInternalToken } from "@/lib/http";
import { AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  paymentId: z.string().optional(),
  checkoutRequestId: z.string().optional(),
});

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    if (!isMockMpesa() || process.env.NODE_ENV === "production") {
      throw new AuthError("Mock callback is disabled", 403);
    }
    try {
      requireInternalToken(req);
    } catch {
      // Portal demo button is allowed in mock mode without the worker token.
    }
    const body = schema.parse(await req.json().catch(() => ({})));
    const payment = body.paymentId
      ? await prisma.payment.findUnique({ where: { id: body.paymentId } })
      : body.checkoutRequestId
        ? await prisma.payment.findUnique({ where: { checkoutRequestId: body.checkoutRequestId } })
        : null;
    if (!payment || !payment.checkoutRequestId) {
      return json({ error: "Payment not found", requestId }, { status: 404, requestId });
    }
    const result = await applyStkCallback(
      prisma,
      mockSuccessCallback(
        payment.checkoutRequestId,
        payment.amountKes,
        payment.phone,
        payment.merchantRequestId || "mock",
      ),
      requestId,
    );
    return json({ ...result, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
