import { z } from "zod";

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
  MPESA_SHORTCODE: z.string().default("174379"),
  MPESA_PAYBILL: z.string().optional().default(""),
  MPESA_PASSKEY: z.string().optional().default(""),
  MPESA_CALLBACK_URL: z.string().optional().default(""),
  MPESA_C2B_CONFIRMATION_URL: z.string().optional().default(""),
  MPESA_C2B_VALIDATION_URL: z.string().optional().default(""),
  MPESA_STK_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
  MPESA_MOCK_AUTO_PAY: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
  MPESA_WEBHOOK_CIDRS: z.string().optional().default(""),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}

export function isMockMpesa(): boolean {
  return getEnv().MPESA_PROVIDER === "mock" || getEnv().NODE_ENV === "test";
}

/** STK and manual Paybill both use this Equity-linked Safaricom shortcode. */
export function mpesaPaybillShortcode(): string {
  const env = getEnv();
  return (env.MPESA_PAYBILL || env.MPESA_SHORTCODE).trim();
}
