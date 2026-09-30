import type { NextConfig } from "next";

function serverActionOrigins(): string[] {
  const hosts = new Set(["127.0.0.1:43127", "localhost:43127"]);
  const app = process.env.APP_URL;
  if (app) {
    try {
      const url = new URL(app);
      hosts.add(url.host);
      hosts.add(url.hostname);
    } catch {
      /* ignore invalid APP_URL at build time */
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
  serverExternalPackages: ["argon2", "pino", "@prisma/client", "ioredis"],
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins(),
    },
  },
};

export default nextConfig;
