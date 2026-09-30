import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(4).optional(),
  priceKes: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  downloadKbps: z.number().int().positive().optional(),
  uploadKbps: z.number().int().positive().optional(),
  simultaneousUse: z.number().int().positive().optional(),
  renewalMode: z.enum(["EXTEND", "QUEUE"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("packages:write");
    const { id } = await ctx.params;
    const before = await prisma.package.findUnique({ where: { id } });
    if (!before) return json({ error: "Not found", requestId }, { status: 404, requestId });
    const body = writeSchema.parse(await req.json());
    const pkg = await prisma.package.update({ where: { id }, data: body });
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "package.update",
      entityType: "package",
      entityId: id,
      before,
      after: pkg,
      ip: clientIp(req),
      requestId,
    });
    return json({ package: pkg, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
