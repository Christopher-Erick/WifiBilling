import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import type { Permission } from "@/lib/rbac";
import { hasPermission } from "@/lib/rbac";

const COOKIE = "lipawifi_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function secretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: String(payload.name ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const dbUser = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!dbUser || !dbUser.isActive) return null;
  return { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role };
}

export function sessionCookieOptions() {
  const secure = getEnv().NODE_ENV === "production";
  return {
    name: COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Authentication required", 401);
  if (permission && !hasPermission(user.role, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}
