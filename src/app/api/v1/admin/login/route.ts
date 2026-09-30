import { z } from "zod";
import { verify } from "argon2";
import { prisma } from "@/lib/db";
import { errorResponse, json, requestIdFrom, clientIp, assertSameOrigin } from "@/lib/http";
import { signSession, sessionCookieOptions } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const body = schema.parse(await req.json());
    const user = await prisma.adminUser.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.isActive) {
      return json({ error: "Invalid email or password", requestId }, { status: 401, requestId });
    }
    const ok = await verify(user.passwordHash, body.password);
    if (!ok) {
      return json({ error: "Invalid email or password", requestId }, { status: 401, requestId });
    }
    const token = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    const jar = await cookies();
    const opts = sessionCookieOptions();
    jar.set(opts.name, token, opts);
    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "admin.login",
      entityType: "admin_user",
      entityId: user.id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      requestId,
    });
    return json({ id: user.id, email: user.email, name: user.name, role: user.role, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
