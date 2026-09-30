import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { syncNas } from "@/lib/radius";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  name: z.string().min(2),
  siteName: z.string().min(2),
  host: z.string().min(3),
  apiPort: z.number().int().positive().default(8728),
  apiUsername: z.string().min(1),
  apiPassword: z.string().min(1),
  radiusSecret: z.string().min(4),
  nasIdentifier: z.string().min(2),
  walledGarden: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("devices:read");
    const devices = await prisma.mikrotikDevice.findMany({ orderBy: { siteName: "asc" } });
    return json(
      {
        devices: devices.map((d) => ({ ...d, apiPassword: "••••", radiusSecret: "••••" })),
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const user = await requireUser("devices:write");
    const body = writeSchema.parse(await req.json());
    const device = await prisma.mikrotikDevice.create({ data: body });
    await syncNas(prisma, device);
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "device.create",
      entityType: "mikrotik_device",
      entityId: device.id,
      after: { name: device.name, host: device.host, nasIdentifier: device.nasIdentifier },
      ip: clientIp(req),
      requestId,
    });
    return json({ device: { ...device, apiPassword: "••••", radiusSecret: "••••" }, requestId }, { status: 201, requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
