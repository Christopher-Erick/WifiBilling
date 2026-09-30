import { Role } from "@prisma/client";
import { ROLES, type Permission, type RoleName, hasPermission } from "@/lib/rbac";

export { ROLES, hasPermission };
export type { Permission, RoleName };

export function parseRole(role: Role | string): RoleName {
  if (ROLES.includes(role as RoleName)) return role as RoleName;
  return "READ_ONLY";
}
