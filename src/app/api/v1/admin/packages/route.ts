import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(4),
  priceKes: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
  downloadKbps: z.number().int().positive(),
  uploadKbps: z.number().int().positive(),
  simultaneousUse: z.number().int().positive().default(1),
  renewalMode: z.enum(["EXTEND", "QUEUE"]).default("EXTEND"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("packages:read");
    const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });
    return json({ packages, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("packages:write");
    const body = writeSchema.parse(await req.json());
    const pkg = await prisma.package.create({ data: body });
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "package.create",
      entityType: "package",
      entityId: pkg.id,
      after: body,
      ip: clientIp(req),
      requestId,
    });
    return json({ package: pkg, requestId }, { status: 201, requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
