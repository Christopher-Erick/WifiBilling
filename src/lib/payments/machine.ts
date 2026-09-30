import type { PaymentStatus } from "@prisma/client";

export const PAYMENT_STATUSES = [
  "INITIATED",
  "STK_SENT",
  "STK_FAILED",
  "PAID",
  "FAILED",
  "CANCELLED",
  "ACTIVATING",
  "ACTIVATED",
  "ACTIVATION_FAILED",
] as const;

export type PaymentStatusName = (typeof PAYMENT_STATUSES)[number];

const ALLOWED: Record<PaymentStatusName, PaymentStatusName[]> = {
  INITIATED: ["STK_SENT", "STK_FAILED", "CANCELLED"],
  STK_SENT: ["PAID", "FAILED", "CANCELLED", "STK_FAILED"],
  STK_FAILED: ["STK_SENT", "CANCELLED"],
  PAID: ["ACTIVATING"],
  FAILED: [],
  CANCELLED: [],
  ACTIVATING: ["ACTIVATED", "ACTIVATION_FAILED"],
  ACTIVATED: [],
  ACTIVATION_FAILED: ["ACTIVATING"],
};

export class IllegalTransitionError extends Error {
  constructor(
    public from: PaymentStatusName,
    public to: PaymentStatusName,
  ) {
    super(`Illegal payment transition ${from} → ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: PaymentStatusName | PaymentStatus, to: PaymentStatusName | PaymentStatus): boolean {
  return ALLOWED[from as PaymentStatusName]?.includes(to as PaymentStatusName) ?? false;
}

export function assertTransition(from: PaymentStatusName | PaymentStatus, to: PaymentStatusName | PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from as PaymentStatusName, to as PaymentStatusName);
  }
}

export function isTerminalPayment(status: PaymentStatusName | PaymentStatus): boolean {
  return status === "ACTIVATED" || status === "FAILED" || status === "CANCELLED";
}

export function isPaidNotActivated(status: PaymentStatusName | PaymentStatus): boolean {
  return status === "PAID" || status === "ACTIVATION_FAILED" || status === "ACTIVATING";
}

export function isCallbackDuplicate(status: PaymentStatusName | PaymentStatus): boolean {
  return (
    status === "PAID" ||
    status === "ACTIVATING" ||
    status === "ACTIVATED" ||
    status === "ACTIVATION_FAILED"
  );
}
