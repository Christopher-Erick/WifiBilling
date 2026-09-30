import { runSchedulerTick } from "@/jobs/runner";
import { errorResponse, json, requestIdFrom, requireInternalToken } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    requireInternalToken(req);
    await runSchedulerTick();
    return json({ ok: true, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
