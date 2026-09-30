import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("audit:read");
    const take = Math.min(200, Number(new URL(req.url).searchParams.get("take") || 80));
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take });
    return json({ logs, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
