import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { chapHash, md5hex } from "@/lib/chap";

describe("CHAP md5", () => {
  it("matches Node crypto MD5", () => {
    const samples = ["hello", "chap-idsecretchallenge", ""];
    for (const s of samples) {
      expect(md5hex(s)).toBe(createHash("md5").update(s, "utf8").digest("hex"));
    }
  });

  it("hashes chap-id + password + challenge", () => {
    expect(chapHash("a", "pass", "b")).toBe(md5hex("apassb"));
  });
});
