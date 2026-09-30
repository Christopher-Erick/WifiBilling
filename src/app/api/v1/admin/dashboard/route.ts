import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorResponse, json, requestIdFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    await requireUser("dashboard:read");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [todayPaid, activeSubs, paidNotActivated, activatedNotConfirmed, failedStk, packages, devices] =
      await Promise.all([
        prisma.payment.aggregate({
          where: { status: { in: ["PAID", "ACTIVATING", "ACTIVATED", "ACTIVATION_FAILED"] }, createdAt: { gte: startOfDay } },
          _sum: { amountKes: true },
          _count: true,
        }),
        prisma.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
        prisma.payment.count({ where: { status: { in: ["PAID", "ACTIVATION_FAILED"] } } }),
        prisma.payment.count({ where: { status: "ACTIVATED", accessConfirmedAt: null } }),
        prisma.payment.count({ where: { status: { in: ["FAILED", "STK_FAILED"] }, createdAt: { gte: startOfDay } } }),
        prisma.package.count({ where: { isActive: true } }),
        prisma.mikrotikDevice.count({ where: { isActive: true } }),
      ]);
    const recent = await prisma.payment.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { package: true, device: true },
    });
    return json(
      {
        kpis: {
          todayRevenueKes: todayPaid._sum.amountKes ?? 0,
          todayPayments: todayPaid._count,
          activeSubscriptions: activeSubs,
          paidNotActivated,
          activatedNotConfirmed,
          failedToday: failedStk,
          activePackages: packages,
          activeDevices: devices,
        },
        recent: recent.map((p) => ({
          id: p.id,
          status: p.status,
          amountKes: p.amountKes,
          phone: p.phone,
          packageName: p.package.name,
          deviceName: p.device.name,
          createdAt: p.createdAt,
        })),
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
