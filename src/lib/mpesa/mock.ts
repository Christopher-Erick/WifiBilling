import { nanoid } from "nanoid";
import type { MpesaProvider, StkPushInput, StkPushResult, StkQueryResult } from "@/lib/mpesa/types";

const sentAt = new Map<string, number>();

export function createMockMpesa(autoPayDelayMs = 2500): MpesaProvider {
  return {
    name: "mock",
    async stkPush(input: StkPushInput): Promise<StkPushResult> {
      const merchantRequestId = `mock-m-${nanoid(10)}`;
      const checkoutRequestId = `mock-c-${nanoid(12)}`;
      sentAt.set(checkoutRequestId, Date.now());
      void input;
      return {
        merchantRequestId,
        checkoutRequestId,
        responseCode: "0",
        responseDescription: "Success. Request accepted for processing",
        customerMessage: "Success. Request accepted for processing",
      };
    },
    async queryStk(checkoutRequestId: string): Promise<StkQueryResult> {
      const started = sentAt.get(checkoutRequestId);
      if (!started) {
        // Worker is a separate process and does not share this map.
        // Never treat "unknown" as a customer cancel (1032).
        return { resultCode: "4999", resultDesc: "The transaction is being processed", checkoutRequestId };
      }
      if (Date.now() - started < autoPayDelayMs) {
        return { resultCode: "4999", resultDesc: "The transaction is being processed", checkoutRequestId };
      }
      return {
        resultCode: "0",
        resultDesc: "The service request is processed successfully.",
        checkoutRequestId,
      };
    },
  };
}
