import { prisma } from "@/lib/db";
import { errorResponse, json, requestIdFrom } from "@/lib/http";
import { loginActionUrl, type HotspotParams } from "@/lib/hotspot";
import { isMockMpesa } from "@/lib/env";
import { getPortalConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(req);
  try {
    const { id } = await ctx.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { subscription: true, package: true, device: true },
    });
    if (!payment) return json({ error: "Not found", requestId }, { status: 404, requestId });
    const hotspot = (payment.hotspot ?? {}) as HotspotParams;
    const config = await getPortalConfig(prisma);
    return json(
      {
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
                startsAt: payment.subscription.startsAt,
                expiresAt: payment.subscription.expiresAt,
                status: payment.subscription.status,
                loginUrl: loginActionUrl(hotspot),
                chapId: hotspot["chap-id"] ?? null,
                chapChallenge: hotspot["chap-challenge"] ?? null,
                dst: hotspot.dst || hotspot["link-orig"] || null,
              }
            : null,
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
