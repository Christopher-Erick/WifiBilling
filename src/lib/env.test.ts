import { afterEach, describe, expect, it } from "vitest";
import { mpesaPaybillShortcode, resetEnvCache } from "@/lib/env";

describe("mpesaPaybillShortcode", () => {
  afterEach(() => {
    process.env.MPESA_PAYBILL = "";
    process.env.MPESA_SHORTCODE = "174379";
    resetEnvCache();
  });

  it("uses MPESA_PAYBILL so STK and manual Paybill share the Equity shortcode", () => {
    process.env.MPESA_PAYBILL = "888555";
    process.env.MPESA_SHORTCODE = "174379";
    resetEnvCache();
    expect(mpesaPaybillShortcode()).toBe("888555");
  });

  it("falls back to MPESA_SHORTCODE", () => {
    process.env.MPESA_PAYBILL = "";
    process.env.MPESA_SHORTCODE = "174379";
    resetEnvCache();
    expect(mpesaPaybillShortcode()).toBe("174379");
  });
});
