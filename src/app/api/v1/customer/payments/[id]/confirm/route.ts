import { prisma } from "@/lib/db";
import { errorResponse, json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    const { id } = await ctx.params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return json({ error: "Not found", requestId }, { status: 404, requestId });
    if (payment.status !== "ACTIVATED") {
      return json({ error: "Payment is not activated", requestId }, { status: 409, requestId });
    }
    const updated = await prisma.payment.update({
      where: { id },
      data: { accessConfirmedAt: new Date() },
    });
    return json({ paymentId: updated.id, accessConfirmedAt: updated.accessConfirmedAt, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
