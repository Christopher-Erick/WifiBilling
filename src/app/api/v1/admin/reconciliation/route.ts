import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("payments:read");
    const paidNotActivated = await prisma.payment.findMany({
      where: { status: { in: ["PAID", "ACTIVATION_FAILED"] } },
      include: { package: true, device: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const activatedNotConfirmed = await prisma.payment.findMany({
      where: { status: "ACTIVATED", OR: [{ accessConfirmedAt: null }, { radiusProvisionedAt: null }] },
      include: { package: true, device: true, subscription: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json({ paidNotActivated, activatedNotConfirmed, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("payments:reconcile");
    const body = (await req.json()) as { paymentId: string; action: "confirm" };
    if (body.action === "confirm") {
      const payment = await prisma.payment.update({
        where: { id: body.paymentId },
        data: { accessConfirmedAt: new Date() },
      });
      await writeAudit({
        actorType: "admin",
        actorId: user.id,
        actorEmail: user.email,
        action: "payment.access_confirmed",
        entityType: "payment",
        entityId: payment.id,
        ip: clientIp(req),
        requestId,
      });
      return json({ payment, requestId }, { requestId });
    }
    return json({ error: "Unknown action", requestId }, { status: 400, requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
