import { Suspense } from "react";
import { PortalClient } from "@/components/portal/portal-client";
import { listPublicPackages } from "@/lib/packages";
import { getPortalConfig } from "@/lib/settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const [packages, config] = await Promise.all([listPublicPackages(), getPortalConfig(prisma)]);
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading packages…</p>}>
      <PortalClient initialPackages={packages} config={config} />
    </Suspense>
  );
}
