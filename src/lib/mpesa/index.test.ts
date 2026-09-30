import { afterEach, describe, expect, it } from "vitest";
import { getMpesaProvider } from "@/lib/mpesa";
import { resetEnvCache } from "@/lib/env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetEnvCache();
});

describe("getMpesaProvider", () => {
  it("throws when mock is configured under NODE_ENV=production", () => {
    process.env = {
      ...original,
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://lipawifi:x@127.0.0.1:5432/lipawifi",
      SESSION_SECRET: "prod-session-secret-32chars-minimum-ok",
      INTERNAL_API_TOKEN: "prod-internal-token",
      MPESA_PROVIDER: "mock",
    };
    resetEnvCache();
    expect(() => getMpesaProvider()).toThrow(/mock is not allowed/);
  });
});
