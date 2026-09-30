import { Redis } from "ioredis";
import { logger } from "@/lib/logger";

let client: Redis | null = null;
let failed = false;

export function getRedis(): Redis | null {
  if (failed) return null;
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      logger.warn({ err: err.message }, "redis error");
    });
    return client;
  } catch {
    failed = true;
    return null;
  }
}

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, windowSec);
      return { ok: n <= limit, remaining: Math.max(0, limit - n) };
    } catch {
      // fall through to memory
    }
  }
  const now = Date.now();
  const row = memory.get(key);
  if (!row || row.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }
  row.count += 1;
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count) };
}

export async function withLock(key: string, ttlSec: number, fn: () => Promise<void>): Promise<boolean> {
  const redis = getRedis();
  const lockKey = `lock:${key}`;
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const ok = await redis.set(lockKey, "1", "EX", ttlSec, "NX");
      if (ok !== "OK") return false;
      try {
        await fn();
      } finally {
        await redis.del(lockKey);
      }
      return true;
    } catch {
      // fall through
    }
  }
  await fn();
  return true;
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (redis.status === "wait") await redis.connect();
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
