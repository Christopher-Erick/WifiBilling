import { prisma } from "@/lib/db";
import { rateLimitFromKbps, formatDuration, formatSpeedKbps } from "@/lib/utils";

export type PublicPackage = {
  id: string;
  name: string;
  description: string;
  priceKes: number;
  durationSeconds: number;
  durationLabel: string;
  speedLabel: string;
  rateLimit: string;
  downloadKbps: number;
  uploadKbps: number;
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
    durationLabel: formatDuration(p.durationSeconds),
    speedLabel: formatSpeedKbps(p.downloadKbps, p.uploadKbps),
    rateLimit: rateLimitFromKbps(p.downloadKbps, p.uploadKbps),
    downloadKbps: p.downloadKbps,
    uploadKbps: p.uploadKbps,
    renewalMode: p.renewalMode,
  }));
}
