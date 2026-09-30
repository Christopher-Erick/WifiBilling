import { prisma } from "@/lib/db";
import { isMockMpesa } from "@/lib/env";
import { applyC2bConfirmation, mockC2bConfirmation } from "@/lib/payments/service";
import { errorResponse, json, requestIdFrom } from "@/lib/http";
import { AuthError } from "@/lib/auth";
import { getPortalConfig } from "@/lib/settings";
import { PaymentError } from "@/lib/payments/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    if (!isMockMpesa() || process.env.NODE_ENV === "production") {
      throw new AuthError("Demo payment is disabled", 403);
    }
    const { id } = await ctx.params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return json({ error: "Payment not found", requestId }, { status: 404, requestId });
    if (!payment.accountReference) {
      throw new PaymentError("This payment has no Paybill account number");
    }
    const config = await getPortalConfig(prisma);
    const result = await applyC2bConfirmation(
      prisma,
      mockC2bConfirmation({
        amountKes: payment.amountKes,
        phone: payment.phone,
        accountReference: payment.accountReference,
        paybillNumber: config.paybillNumber || "174379",
      }),
      requestId,
    );
    return json({ ...result, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
