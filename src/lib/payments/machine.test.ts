import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, IllegalTransitionError, isCallbackDuplicate, isPaidNotActivated } from "@/lib/payments/machine";

describe("payment state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("INITIATED", "STK_SENT")).toBe(true);
    expect(canTransition("STK_SENT", "PAID")).toBe(true);
    expect(canTransition("PAID", "ACTIVATING")).toBe(true);
    expect(canTransition("ACTIVATING", "ACTIVATED")).toBe(true);
  });

  it("allows Paybill C2B without STK", () => {
    expect(canTransition("INITIATED", "PAID")).toBe(true);
    expect(canTransition("STK_FAILED", "PAID")).toBe(true);
    expect(canTransition("INITIATED", "FAILED")).toBe(true);
  });

  it("rejects skipping paid", () => {
    expect(canTransition("STK_SENT", "ACTIVATED")).toBe(false);
    expect(() => assertTransition("STK_SENT", "ACTIVATED")).toThrow(IllegalTransitionError);
  });

  it("treats paid-and-later as duplicate callbacks", () => {
    expect(isCallbackDuplicate("PAID")).toBe(true);
    expect(isCallbackDuplicate("ACTIVATED")).toBe(true);
    expect(isCallbackDuplicate("STK_SENT")).toBe(false);
  });

  it("flags reconciliation bucket", () => {
    expect(isPaidNotActivated("PAID")).toBe(true);
    expect(isPaidNotActivated("ACTIVATION_FAILED")).toBe(true);
    expect(isPaidNotActivated("ACTIVATED")).toBe(false);
  });

  it("allows retry from activation failure", () => {
    expect(canTransition("ACTIVATION_FAILED", "ACTIVATING")).toBe(true);
    expect(canTransition("ACTIVATED", "PAID")).toBe(false);
  });
});
