import { afterEach, describe, expect, it } from "vitest";
import {
  cookiesShouldBeSecure,
  getEnv,
  isMockMpesa,
  mpesaPaybillShortcode,
  resetEnvCache,
  stkWebhookUrl,
} from "@/lib/env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetEnvCache();
});

function baseEnv(extra: Record<string, string> = {}) {
  process.env = {
    ...original,
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://lipawifi:x@127.0.0.1:5432/lipawifi",
    SESSION_SECRET: "dev-session-secret-32chars-minimum",
    INTERNAL_API_TOKEN: "dev-internal-token",
    MPESA_PROVIDER: "mock",
    APP_URL: "http://127.0.0.1:43127",
    TRUST_PROXY: "none",
    MPESA_SHORTCODE: "174379",
    MPESA_PAYBILL: "",
    ...extra,
  };
  resetEnvCache();
}

describe("env", () => {
  it("allows mock M-Pesa in development", () => {
    baseEnv({ NODE_ENV: "development", MPESA_PROVIDER: "mock" });
    expect(isMockMpesa()).toBe(true);
  });

  it("refuses mock M-Pesa when NODE_ENV=production", () => {
    baseEnv({
      NODE_ENV: "production",
      MPESA_PROVIDER: "mock",
      SESSION_SECRET: "prod-session-secret-32chars-minimum-ok",
      INTERNAL_API_TOKEN: "prod-internal-token",
    });
    expect(isMockMpesa()).toBe(false);
  });

  it("rejects weak production secrets", () => {
    baseEnv({
      NODE_ENV: "production",
      SESSION_SECRET: "replace-with-a-long-random-string-at-least-32",
      INTERNAL_API_TOKEN: "replace-with-internal-token",
    });
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });

  it("builds the public STK webhook URL from APP_URL", () => {
    baseEnv({ APP_URL: "https://wifi.example.co.ke" });
    expect(stkWebhookUrl()).toBe("https://wifi.example.co.ke/api/v1/webhooks/mpesa/stk");
  });

  it("sets Secure cookies only when APP_URL is https (auto)", () => {
    baseEnv({ APP_URL: "http://127.0.0.1:43127", COOKIE_SECURE: "auto" });
    expect(cookiesShouldBeSecure()).toBe(false);
    baseEnv({ APP_URL: "https://wifi.example.co.ke", COOKIE_SECURE: "auto" });
    expect(cookiesShouldBeSecure()).toBe(true);
  });
});

describe("mpesaPaybillShortcode", () => {
  it("uses MPESA_PAYBILL so STK and manual Paybill share the Equity shortcode", () => {
    baseEnv({ MPESA_PAYBILL: "888555", MPESA_SHORTCODE: "174379" });
    expect(mpesaPaybillShortcode()).toBe("888555");
  });

  it("falls back to MPESA_SHORTCODE", () => {
    baseEnv({ MPESA_PAYBILL: "", MPESA_SHORTCODE: "174379" });
    expect(mpesaPaybillShortcode()).toBe("174379");
  });
});
