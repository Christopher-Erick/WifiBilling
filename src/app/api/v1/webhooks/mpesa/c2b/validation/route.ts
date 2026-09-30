import { json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return json({ ResultCode: 0, ResultDesc: "Accepted", requestId }, { requestId });
}
