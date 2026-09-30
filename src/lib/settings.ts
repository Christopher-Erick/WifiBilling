import type { PrismaClient } from "@prisma/client";
import { getEnv, isMockMpesa, mpesaPaybillShortcode } from "@/lib/env";

export type PortalConfig = {
  brandName: string;
  supportPhone: string;
  paybillNumber: string;
  stkEnabled: boolean;
  mock: boolean;
};

function jsonScalar(value: unknown): string | boolean | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return String(value);
  return null;
}

export async function getPortalConfig(prisma: PrismaClient): Promise<PortalConfig> {
  const env = getEnv();
  const rows = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const paybill = String(jsonScalar(map.paybill_number) || mpesaPaybillShortcode() || "").trim();
  const stkSetting = jsonScalar(map.stk_enabled);
  const stkEnabled = stkSetting === false || stkSetting === "false" ? false : env.MPESA_STK_ENABLED;
  return {
    brandName: String(jsonScalar(map.brand_name) || env.APP_NAME || "LipaWiFi"),
    supportPhone: String(jsonScalar(map.support_phone) || ""),
    paybillNumber: paybill,
    stkEnabled,
    mock: isMockMpesa(),
  };
}
