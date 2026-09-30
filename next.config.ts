import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
  serverExternalPackages: ["argon2", "pino", "@prisma/client", "ioredis"],
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1:43127", "localhost:43127"],
    },
  },
};

export default nextConfig;
