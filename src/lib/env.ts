import { z } from "zod";

const boolish = (fallback: string) =>
  z
    .string()
    .optional()
    .default(fallback)
    .transform((v) => v !== "false");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("LipaWiFi"),
  APP_URL: z.string().default("http://127.0.0.1:43127"),
  PORT: z.coerce.number().default(43127),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  SESSION_SECRET: z.string().min(16),
  INTERNAL_API_TOKEN: z.string().min(8),
  MPESA_PROVIDER: z.enum(["mock", "daraja"]).default("mock"),
  MPESA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CONSUMER_KEY: z.string().optional().default(""),
  MPESA_CONSUMER_SECRET: z.string().optional().default(""),
  /** Safaricom Paybill / Business shortcode. STK uses CustomerPayBillOnline against this. */
  MPESA_SHORTCODE: z.string().default("174379"),
  MPESA_PAYBILL: z.string().optional().default(""),
  MPESA_PASSKEY: z.string().optional().default(""),
  MPESA_CALLBACK_URL: z.string().optional().default(""),
  MPESA_C2B_CONFIRMATION_URL: z.string().optional().default(""),
  MPESA_C2B_VALIDATION_URL: z.string().optional().default(""),
  MPESA_STK_ENABLED: boolish("true"),
  MPESA_MOCK_AUTO_PAY: boolish("true"),
  MPESA_WEBHOOK_CIDRS: z.string().optional().default(""),
  /**
   * Who may set forwarding headers.
   * none — ignore X-Forwarded-* and CF-Connecting-IP (default).
   * nginx — trust X-Real-IP / X-Forwarded-For from the Compose origin proxy.
   * cloudflare — trust CF-Connecting-IP (and X-Forwarded-For only when CF-Ray is present).
   */
  TRUST_PROXY: z.enum(["none", "nginx", "cloudflare"]).default("none"),
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).default("auto"),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

const WEAK_SECRET = /replace-with|change-me|lipawifi_dev|changeme|please-change/i;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  const data = parsed.data;
  if (data.NODE_ENV === "production") {
    if (data.SESSION_SECRET.length < 32 || WEAK_SECRET.test(data.SESSION_SECRET)) {
      throw new Error("SESSION_SECRET must be a strong random value of at least 32 characters in production");
    }
    if (data.INTERNAL_API_TOKEN.length < 16 || WEAK_SECRET.test(data.INTERNAL_API_TOKEN)) {
      throw new Error("INTERNAL_API_TOKEN must be a strong random value of at least 16 characters in production");
    }
  }
  cached = data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}

/** Mock Daraja is for local/dev/test only. Production always returns false. */
export function isMockMpesa(): boolean {
  if (getEnv().NODE_ENV === "production") return false;
  return getEnv().MPESA_PROVIDER === "mock" || getEnv().NODE_ENV === "test";
}

export function publicOrigin(): string {
  return getEnv().APP_URL.replace(/\/$/, "");
}

export function stkWebhookUrl(): string {
  const env = getEnv();
  return env.MPESA_CALLBACK_URL || `${publicOrigin()}/api/v1/webhooks/mpesa/stk`;
}

export function c2bConfirmationUrl(): string {
  const env = getEnv();
  return env.MPESA_C2B_CONFIRMATION_URL || `${publicOrigin()}/api/v1/webhooks/mpesa/c2b/confirmation`;
}

export function c2bValidationUrl(): string {
  const env = getEnv();
  return env.MPESA_C2B_VALIDATION_URL || `${publicOrigin()}/api/v1/webhooks/mpesa/c2b/validation`;
}

export function cookiesShouldBeSecure(): boolean {
  const env = getEnv();
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return publicOrigin().startsWith("https://");
}

/** STK and manual Paybill both use this Equity-linked Safaricom shortcode. */
export function mpesaPaybillShortcode(): string {
  const env = getEnv();
  return (env.MPESA_PAYBILL || env.MPESA_SHORTCODE).trim();
}
