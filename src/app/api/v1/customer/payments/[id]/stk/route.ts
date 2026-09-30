import { prisma } from "@/lib/db";
import { errorResponse, json, requestIdFrom, clientIp } from "@/lib/http";
import { requestStkForPayment } from "@/lib/payments/service";
import { isMockMpesa } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    const { id } = await ctx.params;
    const result = await requestStkForPayment(prisma, id, { ip: clientIp(req), requestId });
    return json(
      {
        paymentId: result.payment.id,
        status: result.payment.status,
        checkoutRequestId: result.payment.checkoutRequestId,
        customerMessage: result.customerMessage,
        mock: result.mock || isMockMpesa(),
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
