import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, assertSameOrigin, clientIp } from "@/lib/http";
import { revokeSubscription } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("subscriptions:read");
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { package: true, device: true, customer: true },
    });
    return json({ subscriptions, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("subscriptions:revoke");
    const body = (await req.json()) as { id: string; action: "revoke" };
    if (body.action !== "revoke") return json({ error: "Unknown action", requestId }, { status: 400, requestId });
    await revokeSubscription(prisma, body.id, { id: user.id, email: user.email }, requestId);
    return json({ ok: true, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
