import { prisma } from "@/lib/db";
import { pingRedis } from "@/lib/redis";
import { json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  const redis = await pingRedis();
  const ready = db;
  return json(
    { ready, db, redis, requestId },
    { status: ready ? 200 : 503, requestId },
  );
}
