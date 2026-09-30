import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    const user = await requireUser("dashboard:read");
    return json({ ...user, requestId }, { requestId });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
