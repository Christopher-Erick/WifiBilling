import { Suspense } from "react";
import { PortalClient } from "@/components/portal/portal-client";
import { listPublicPackages } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const packages = await listPublicPackages();
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading portal…</p>}>
      <PortalClient initialPackages={packages} />
    </Suspense>
  );
}
