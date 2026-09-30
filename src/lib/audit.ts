import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditInput = {
  actorId?: string | null;
  actorType: "admin" | "customer" | "system" | "webhook";
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

export async function writeAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorType: input.actorType,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    },
  });
}
