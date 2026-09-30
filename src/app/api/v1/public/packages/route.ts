import { prisma } from "@/lib/db";
import { json, requestIdFrom } from "@/lib/http";
import { rateLimitFromKbps } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return json(
    {
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceKes: p.priceKes,
        durationSeconds: p.durationSeconds,
        rateLimit: rateLimitFromKbps(p.downloadKbps, p.uploadKbps),
        renewalMode: p.renewalMode,
      })),
      requestId,
    },
    { requestId },
  );
}
