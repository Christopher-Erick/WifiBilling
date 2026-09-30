import { listPublicPackages } from "@/lib/packages";
import { json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  const packages = await listPublicPackages();
  return json({ packages, requestId }, { requestId });
}
