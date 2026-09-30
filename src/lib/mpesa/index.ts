import { getEnv, isMockMpesa } from "@/lib/env";
import { createMockMpesa } from "@/lib/mpesa/mock";
import { darajaProvider } from "@/lib/mpesa/daraja";
import type { MpesaProvider } from "@/lib/mpesa/types";

export function assertLiveMpesaAllowed() {
  const env = getEnv();
  if (env.MPESA_PROVIDER === "mock" && env.NODE_ENV === "production") {
    throw new Error("MPESA_PROVIDER=mock is not allowed when NODE_ENV=production");
  }
}

export function getMpesaProvider(): MpesaProvider {
  const env = getEnv();
  assertLiveMpesaAllowed();
  if (isMockMpesa()) {
    return createMockMpesa(env.MPESA_MOCK_AUTO_PAY ? 2500 : 60 * 60 * 1000);
  }
  return darajaProvider;
}

export type { MpesaProvider };
