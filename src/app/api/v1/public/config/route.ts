import { prisma } from "@/lib/db";
import { getPortalConfig } from "@/lib/settings";
import { json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  const config = await getPortalConfig(prisma);
  return json({ ...config, requestId }, { requestId });
}
