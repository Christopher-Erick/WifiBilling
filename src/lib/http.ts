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

function firstHop(header: string | null): string | null {
  const value = header?.split(",")[0]?.trim();
  return value || null;
}

/**
 * Client IP for audit / rate-limit. Forwarding headers are ignored unless
 * TRUST_PROXY is nginx (Compose origin) or cloudflare (edge). Do not set
 * TRUST_PROXY=cloudflare on an origin that is reachable except via Cloudflare.
 */
export function clientIp(req: Request): string {
  const mode = getEnv().TRUST_PROXY;
  if (mode === "cloudflare") {
    const cf = req.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
    if (req.headers.get("cf-ray")) {
      return firstHop(req.headers.get("x-forwarded-for")) || "unknown";
    }
    return "unknown";
  }
  if (mode === "nginx") {
    return req.headers.get("x-real-ip")?.trim() || firstHop(req.headers.get("x-forwarded-for")) || "unknown";
  }
  return "unknown";
}

export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (getEnv().NODE_ENV !== "production") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const app = getEnv().APP_URL.replace(/\/$/, "");
  if (origin.replace(/\/$/, "") !== app) {
    throw new AuthError("Cross-origin request blocked", 403);
  }
}

export function requireInternalToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.headers.get("x-internal-token") || "";
  if (!token || token !== getEnv().INTERNAL_API_TOKEN) {
    throw new AuthError("Invalid internal token", 401);
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const trimmed = cidr.trim();
  if (!trimmed) return false;
  if (!trimmed.includes("/")) return ip === trimmed;
  const [base, bitsRaw] = trimmed.split("/");
  const bits = Number(bitsRaw);
  const ipN = ipv4ToInt(ip);
  const baseN = ipv4ToInt(base);
  if (ipN === null || baseN === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : ~((1 << (32 - bits)) - 1) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

export function assertWebhookAllowed(req: Request) {
  const cidrs = getEnv()
    .MPESA_WEBHOOK_CIDRS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (cidrs.length === 0) return;
  const ip = clientIp(req);
  if (ip === "unknown" || !cidrs.some((c) => ipMatchesCidr(ip, c))) {
    throw new AuthError("Webhook source is not allowed", 403);
  }
}
