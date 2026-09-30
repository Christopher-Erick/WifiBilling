"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verify } from "argon2";
import { prisma } from "@/lib/db";
import { signSession, sessionCookieOptions } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { error: "Invalid email or password" };
  }
  const ok = await verify(user.passwordHash, password);
  if (!ok) {
    return { error: "Invalid email or password" };
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
  });
  redirect(next.startsWith("/") ? next : "/admin");
}
