import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { PhoneError } from "@/lib/phone";
import { IllegalTransitionError } from "@/lib/payments/machine";
import { PaymentError } from "@/lib/payments/errors";
import { createLogger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { nanoid } from "nanoid";

export function requestIdFrom(req: Request): string {
  return req.headers.get("x-request-id") || nanoid();
}

export function json<T>(data: T, init?: { status?: number; requestId?: string }) {
  const res = NextResponse.json(data, { status: init?.status ?? 200 });
  if (init?.requestId) res.headers.set("x-request-id", init.requestId);
  return res;
}

export function errorResponse(err: unknown, requestId: string) {
  const log = createLogger(requestId);
  if (err instanceof AuthError) {
    return json({ error: err.message, requestId }, { status: err.status, requestId });
  }
  if (err instanceof PhoneError || err instanceof IllegalTransitionError || err instanceof PaymentError) {
    return json({ error: err.message, requestId }, { status: 400, requestId });
  }
  if (err instanceof ZodError) {
    return json(
      { error: "Validation failed", details: err.issues.map((i) => ({ path: i.path, message: i.message })), requestId },
      { status: 400, requestId },
    );
  }
  if (err instanceof Error && err.name === "ForbiddenError") {
    return json({ error: "Forbidden", requestId }, { status: 403, requestId });
  }
  log.error({ err }, "unhandled error");
  const message = getEnv().NODE_ENV === "production" ? "Internal server error" : err instanceof Error ? err.message : "Error";
  return json({ error: message, requestId }, { status: 500, requestId });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (getEnv().NODE_ENV !== "production") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const app = getEnv().APP_URL.replace(/\/$/, "");
  if (origin.replace(/\/$/, "") !== app) {
    const err = new AuthError("Cross-origin request blocked", 403);
    throw err;
  }
}

export function requireInternalToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.headers.get("x-internal-token") || "";
  if (!token || token !== getEnv().INTERNAL_API_TOKEN) {
    throw new AuthError("Invalid internal token", 401);
  }
}
