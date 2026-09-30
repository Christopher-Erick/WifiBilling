import { json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return json({ status: "ok", service: "lipawifi", time: new Date().toISOString(), requestId }, { requestId });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
