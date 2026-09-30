import { afterEach, describe, expect, it } from "vitest";
import { clientIp, ipMatchesCidr } from "@/lib/http";
import { resetEnvCache } from "@/lib/env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetEnvCache();
});

function env(extra: Record<string, string> = {}) {
  process.env = {
    ...original,
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://lipawifi:x@127.0.0.1:5432/lipawifi",
    SESSION_SECRET: "dev-session-secret-32chars-minimum",
    INTERNAL_API_TOKEN: "dev-internal-token",
    MPESA_PROVIDER: "mock",
    TRUST_PROXY: "none",
    ...extra,
  };
  resetEnvCache();
}

function req(headers: Record<string, string>) {
  return new Request("http://127.0.0.1:43127/", { headers });
}

describe("clientIp trust", () => {
  it("ignores spoofed forwarding headers when TRUST_PROXY=none", () => {
    env({ TRUST_PROXY: "none" });
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4", "cf-connecting-ip": "5.6.7.8" }))).toBe("unknown");
  });

  it("uses X-Real-IP behind the Compose nginx proxy", () => {
    env({ TRUST_PROXY: "nginx" });
    expect(clientIp(req({ "x-real-ip": "10.5.50.20", "x-forwarded-for": "1.2.3.4" }))).toBe("10.5.50.20");
  });

  it("uses CF-Connecting-IP only when TRUST_PROXY=cloudflare", () => {
    env({ TRUST_PROXY: "cloudflare" });
    expect(clientIp(req({ "cf-connecting-ip": "41.90.1.2", "x-forwarded-for": "1.2.3.4" }))).toBe("41.90.1.2");
  });

  it("does not honour X-Forwarded-For on cloudflare mode without CF-Ray", () => {
    env({ TRUST_PROXY: "cloudflare" });
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("unknown");
  });
});

describe("cidr", () => {
  it("matches ipv4 cidr", () => {
    expect(ipMatchesCidr("10.1.2.3", "10.0.0.0/8")).toBe(true);
    expect(ipMatchesCidr("11.1.2.3", "10.0.0.0/8")).toBe(false);
    expect(ipMatchesCidr("1.2.3.4", "1.2.3.4")).toBe(true);
  });
});
