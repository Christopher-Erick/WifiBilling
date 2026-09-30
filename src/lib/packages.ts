import { prisma } from "@/lib/db";
import { rateLimitFromKbps } from "@/lib/utils";

export type PublicPackage = {
  id: string;
  name: string;
  description: string;
  priceKes: number;
  durationSeconds: number;
  rateLimit: string;
  renewalMode: string;
};

export async function listPublicPackages(): Promise<PublicPackage[]> {
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return packages.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceKes: p.priceKes,
    durationSeconds: p.durationSeconds,
    rateLimit: rateLimitFromKbps(p.downloadKbps, p.uploadKbps),
    renewalMode: p.renewalMode,
  }));
}
