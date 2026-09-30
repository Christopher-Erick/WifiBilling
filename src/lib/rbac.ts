export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE",
  "SUPPORT",
  "NETWORK_OPERATOR",
  "READ_ONLY",
] as const;

export type RoleName = (typeof ROLES)[number];

export type Permission =
  | "packages:read"
  | "packages:write"
  | "devices:read"
  | "devices:write"
  | "customers:read"
  | "customers:write"
  | "payments:read"
  | "payments:reconcile"
  | "subscriptions:read"
  | "subscriptions:revoke"
  | "audit:read"
  | "settings:read"
  | "settings:write"
  | "dashboard:read"
  | "network:operate";

const ALL: Permission[] = [
  "packages:read",
  "packages:write",
  "devices:read",
  "devices:write",
  "customers:read",
  "customers:write",
  "payments:read",
  "payments:reconcile",
  "subscriptions:read",
  "subscriptions:revoke",
  "audit:read",
  "settings:read",
  "settings:write",
  "dashboard:read",
  "network:operate",
];

const MATRIX: Record<RoleName, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL,
  FINANCE: [
    "packages:read",
    "devices:read",
    "customers:read",
    "payments:read",
    "payments:reconcile",
    "subscriptions:read",
    "audit:read",
    "settings:read",
    "dashboard:read",
  ],
  SUPPORT: [
    "packages:read",
    "devices:read",
    "customers:read",
    "customers:write",
    "payments:read",
    "subscriptions:read",
    "subscriptions:revoke",
    "audit:read",
    "settings:read",
    "dashboard:read",
  ],
  NETWORK_OPERATOR: [
    "packages:read",
    "devices:read",
    "devices:write",
    "customers:read",
    "payments:read",
    "subscriptions:read",
    "network:operate",
    "settings:read",
    "dashboard:read",
  ],
  READ_ONLY: [
    "packages:read",
    "devices:read",
    "customers:read",
    "payments:read",
    "subscriptions:read",
    "audit:read",
    "settings:read",
    "dashboard:read",
  ],
};

export function hasPermission(role: RoleName | string, permission: Permission): boolean {
  const perms = MATRIX[role as RoleName];
  if (!perms) return false;
  return perms.includes(permission);
}

export function assertPermission(role: RoleName | string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const err = new Error("Forbidden");
    err.name = "ForbiddenError";
    throw err;
  }
}

export function isWritePermission(permission: Permission): boolean {
  return (
    permission.endsWith(":write") ||
    permission.endsWith(":reconcile") ||
    permission.endsWith(":revoke") ||
    permission.endsWith(":operate")
  );
}
