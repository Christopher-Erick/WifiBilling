import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom } from "@/lib/http";
import { maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("payments:read");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const take = Math.min(100, Number(url.searchParams.get("take") || 50));
    const payments = await prisma.payment.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: { package: true, device: true, subscription: true },
    });
    return json(
      {
        payments: payments.map((p) => ({
          id: p.id,
          status: p.status,
          amountKes: p.amountKes,
          phone: maskPhone(p.phone),
          phoneFull: p.phone,
          packageName: p.package.name,
          deviceName: p.device.name,
          mpesaReceipt: p.mpesaReceipt,
          checkoutRequestId: p.checkoutRequestId,
          failureReason: p.failureReason,
          createdAt: p.createdAt,
          radiusProvisionedAt: p.radiusProvisionedAt,
          accessConfirmedAt: p.accessConfirmedAt,
        })),
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
