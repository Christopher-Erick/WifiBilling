import pino from "pino";

export function createLogger(requestId?: string) {
  return pino({
    level: process.env.LOG_LEVEL || "info",
    base: { service: "lipawifi", requestId },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "password",
        "passwordHash",
        "apiPassword",
        "radiusSecret",
        "passkey",
        "Authorization",
        "MPESA_CONSUMER_SECRET",
        "SESSION_SECRET",
        "INTERNAL_API_TOKEN",
      ],
      remove: true,
    },
  });
}

export const logger = createLogger();
