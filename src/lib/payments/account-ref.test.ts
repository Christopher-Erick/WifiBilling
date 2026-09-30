import { describe, expect, it } from "vitest";
import { generateAccountReference, normalizeBillRef } from "@/lib/payments/account-ref";

describe("Paybill account reference", () => {
  it("is short, uppercase, and phone-typable", () => {
    const ref = generateAccountReference();
    expect(ref).toMatch(/^LW[A-Z2-9]{8}$/);
    expect(ref).not.toMatch(/[01IO]/);
  });

  it("normalizes what customers type on the phone", () => {
    expect(normalizeBillRef(" lw-ab12 cd ")).toBe("LWAB12CD");
    expect(normalizeBillRef("")).toBe("");
  });
});
