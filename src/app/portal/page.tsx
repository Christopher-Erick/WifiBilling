import { Suspense } from "react";
import { PortalClient } from "@/components/portal/portal-client";

export default function PortalPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading portal…</p>}>
      <PortalClient />
    </Suspense>
  );
}
