import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, assertSameOrigin, clientIp } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  brand_name: z.string().min(2).optional(),
  support_phone: z.string().optional(),
  default_renewal_mode: z.enum(["EXTEND", "QUEUE"]).optional(),
  paybill_number: z.string().optional(),
  stk_enabled: z.boolean().optional(),
  c2b_enabled: z.boolean().optional(),
});

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("settings:read");
    const rows = await prisma.systemSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return json({ settings, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function PUT(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("settings:write");
    const body = writeSchema.parse(await req.json());
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue },
        create: { key, value: value as Prisma.InputJsonValue },
      });
    }
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "settings.update",
      entityType: "system_setting",
      after: body,
      ip: clientIp(req),
      requestId,
    });
    const rows = await prisma.systemSetting.findMany();
    return json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])), requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
