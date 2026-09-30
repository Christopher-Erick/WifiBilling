import { z } from "zod";

export const HOTSPOT_PARAM_KEYS = [
  "mac",
  "ip",
  "username",
  "link-login",
  "link-login-only",
  "link-orig",
  "link-orig-esc",
  "chap-id",
  "chap-challenge",
  "error",
  "dst",
  "server",
  "identity",
  "server-name",
  "server-address",
  "hostname",
  "mac-esc",
] as const;

export type HotspotParamKey = (typeof HOTSPOT_PARAM_KEYS)[number];

export type HotspotParams = {
  mac?: string;
  ip?: string;
  username?: string;
  "link-login"?: string;
  "link-login-only"?: string;
  "link-orig"?: string;
  "link-orig-esc"?: string;
  "chap-id"?: string;
  "chap-challenge"?: string;
  error?: string;
  dst?: string;
  server?: string;
  identity?: string;
  "server-name"?: string;
  "server-address"?: string;
  hostname?: string;
  "mac-esc"?: string;
};

export const hotspotParamsSchema = z
  .object({
    mac: z.string().optional(),
    ip: z.string().optional(),
    username: z.string().optional(),
    "link-login": z.string().optional(),
    "link-login-only": z.string().optional(),
    "link-orig": z.string().optional(),
    "link-orig-esc": z.string().optional(),
    "chap-id": z.string().optional(),
    "chap-challenge": z.string().optional(),
    error: z.string().optional(),
    dst: z.string().optional(),
    server: z.string().optional(),
    identity: z.string().optional(),
    "server-name": z.string().optional(),
    "server-address": z.string().optional(),
    hostname: z.string().optional(),
    "mac-esc": z.string().optional(),
  })
  .passthrough();

export function pickHotspotParams(input: Record<string, string | string[] | undefined | null>): HotspotParams {
  const out: Record<string, string> = {};
  for (const key of HOTSPOT_PARAM_KEYS) {
    const raw = input[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) out[key] = value;
  }
  return out as HotspotParams;
}

export function hotspotToSearchParams(params: HotspotParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of HOTSPOT_PARAM_KEYS) {
    const value = params[key];
    if (value) sp.set(key, value);
  }
  return sp;
}

export function loginActionUrl(params: HotspotParams): string | null {
  return params["link-login-only"] || params["link-login"] || null;
}
