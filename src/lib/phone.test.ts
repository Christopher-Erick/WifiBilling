import { describe, expect, it } from "vitest";
import { displayPhone, normalizeKenyanPhone, PhoneError } from "@/lib/phone";

describe("normalizeKenyanPhone", () => {
  it("accepts local 07, +254, 254 and 9-digit national", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("+254712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("254712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("0712 345 678")).toBe("254712345678");
    expect(normalizeKenyanPhone("0110123456")).toBe("254110123456");
  });

  it("rejects landlines and junk", () => {
    expect(() => normalizeKenyanPhone("020123456")).toThrow(PhoneError);
    expect(() => normalizeKenyanPhone("12345")).toThrow(PhoneError);
    expect(() => normalizeKenyanPhone("")).toThrow(PhoneError);
  });

  it("formats display", () => {
    expect(displayPhone("254712345678")).toBe("+254 712 345 678");
  });
});
