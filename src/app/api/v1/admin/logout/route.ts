import { cookies } from "next/headers";
import { sessionCookieOptions, getSessionUser } from "@/lib/auth";
import { json, requestIdFrom } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const user = await getSessionUser();
  const jar = await cookies();
  jar.set(sessionCookieOptions().name, "", { ...sessionCookieOptions(), maxAge: 0 });
  if (user) {
    await writeAudit({
      actorType: "admin",
      actorId: user.id,
      actorEmail: user.email,
      action: "admin.logout",
      entityType: "admin_user",
      entityId: user.id,
      requestId,
    });
  }
  return json({ ok: true, requestId }, { requestId });
}
