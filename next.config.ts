import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["argon2", "pino", "@prisma/client", "ioredis"],
};

export default nextConfig;
