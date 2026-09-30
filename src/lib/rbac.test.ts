import { describe, expect, it } from "vitest";
import { hasPermission, isWritePermission } from "@/lib/rbac";

describe("RBAC", () => {
  it("blocks READ_ONLY from writes", () => {
    expect(hasPermission("READ_ONLY", "packages:read")).toBe(true);
    expect(hasPermission("READ_ONLY", "packages:write")).toBe(false);
    expect(hasPermission("READ_ONLY", "payments:reconcile")).toBe(false);
  });

  it("lets FINANCE reconcile but not edit packages", () => {
    expect(hasPermission("FINANCE", "payments:reconcile")).toBe(true);
    expect(hasPermission("FINANCE", "packages:write")).toBe(false);
  });

  it("lets SUPPORT revoke but not change devices", () => {
    expect(hasPermission("SUPPORT", "subscriptions:revoke")).toBe(true);
    expect(hasPermission("SUPPORT", "devices:write")).toBe(false);
  });

  it("lets NETWORK_OPERATOR manage routers", () => {
    expect(hasPermission("NETWORK_OPERATOR", "devices:write")).toBe(true);
    expect(hasPermission("NETWORK_OPERATOR", "settings:write")).toBe(false);
  });

  it("classifies write permissions", () => {
    expect(isWritePermission("packages:write")).toBe(true);
    expect(isWritePermission("packages:read")).toBe(false);
  });
});
