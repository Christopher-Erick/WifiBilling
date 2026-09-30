import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { retryActivation } from "@/lib/payments/service";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("payments:reconcile");
    const { id } = await ctx.params;
    const result = await retryActivation(prisma, id, requestId);
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "payment.retry_activation",
      entityType: "payment",
      entityId: id,
      ip: clientIp(req),
      requestId,
    });
    return json({ ...result, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
