import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("customers:read");
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        subscriptions: { where: { status: "ACTIVE" }, take: 1, orderBy: { expiresAt: "desc" } },
        _count: { select: { payments: true, subscriptions: true } },
      },
    });
    return json({ customers, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
