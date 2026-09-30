import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isMockMpesa } from "@/lib/env";
import { loginActionUrl, type HotspotParams } from "@/lib/hotspot";
import { getPortalConfig } from "@/lib/settings";
import { PaymentStatusClient } from "@/components/portal/payment-status-client";

export const dynamic = "force-dynamic";

export default async function PaymentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { subscription: true, package: true, device: true },
  });
  if (!payment) notFound();
  const config = await getPortalConfig(prisma);
  const hotspot = (payment.hotspot ?? {}) as HotspotParams;
  return (
    <PaymentStatusClient
      initial={{
        paymentId: payment.id,
        status: payment.status,
        amountKes: payment.amountKes,
        phone: payment.phone,
        packageName: payment.package.name,
        durationSeconds: payment.package.durationSeconds,
        accountReference: payment.accountReference,
        paybillNumber: config.paybillNumber,
        stkEnabled: config.stkEnabled,
        brandName: config.brandName,
        supportPhone: config.supportPhone,
        mock: isMockMpesa(),
        failureReason: payment.failureReason,
        credentials:
          payment.subscription && (payment.status === "ACTIVATED" || payment.subscription.status === "QUEUED")
            ? {
                username: payment.subscription.radiusUsername,
                password: payment.subscription.radiusPassword,
                loginUrl: loginActionUrl(hotspot),
                dst: hotspot.dst || hotspot["link-orig"] || null,
                status: payment.subscription.status,
                expiresAt: payment.subscription.expiresAt.toISOString(),
              }
            : null,
      }}
    />
  );
}
