import type { PrismaClient, RenewalMode } from "@prisma/client";
import { provisionRadiusUser, radiusUsername, randomPassword, revokeRadiusUser } from "@/lib/radius";
import { writeAudit } from "@/lib/audit";
import { getMikrotikAdapter } from "@/lib/mikrotik";

export async function activatePayment(
  prisma: PrismaClient,
  paymentId: string,
  requestId?: string,
): Promise<{ subscriptionId: string; username: string; password: string; expiresAt: Date; startsAt: Date }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { package: true, customer: true, device: true, subscription: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "PAID" && payment.status !== "ACTIVATION_FAILED" && payment.status !== "ACTIVATING") {
    if (payment.status === "ACTIVATED" && payment.subscription) {
      return {
        subscriptionId: payment.subscription.id,
        username: payment.subscription.radiusUsername,
        password: payment.subscription.radiusPassword,
        expiresAt: payment.subscription.expiresAt,
        startsAt: payment.subscription.startsAt,
      };
    }
    throw new Error(`Cannot activate payment in status ${payment.status}`);
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "ACTIVATING" },
  });

  try {
    const pkg = payment.package;
    const renewalMode: RenewalMode = pkg.renewalMode;
    const now = new Date();

    const active = await prisma.subscription.findFirst({
      where: {
        customerId: payment.customerId,
        deviceId: payment.deviceId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });

    let startsAt = now;
    let expiresAt = new Date(now.getTime() + pkg.durationSeconds * 1000);
    let username = radiusUsername(payment.phone, payment.deviceId);
    let password = randomPassword();
    let subStatus: "ACTIVE" | "QUEUED" = "ACTIVE";

    if (active && renewalMode === "EXTEND") {
      startsAt = active.startsAt;
      expiresAt = new Date(active.expiresAt.getTime() + pkg.durationSeconds * 1000);
      username = active.radiusUsername;
      password = active.radiusPassword;
      await prisma.subscription.update({
        where: { id: active.id },
        data: { expiresAt, packageId: pkg.id },
      });
    } else if (active && renewalMode === "QUEUE") {
      startsAt = active.expiresAt;
      expiresAt = new Date(active.expiresAt.getTime() + pkg.durationSeconds * 1000);
      subStatus = "QUEUED";
    }

    const remainingSeconds = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    if (subStatus === "ACTIVE") {
      await provisionRadiusUser(prisma, {
        username,
        password,
        expiresAt,
        sessionTimeout: remainingSeconds,
        downloadKbps: pkg.downloadKbps,
        uploadKbps: pkg.uploadKbps,
        simultaneousUse: pkg.simultaneousUse,
      });
    }

    const subscription = payment.subscription
      ? await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: subStatus,
            renewalMode,
            radiusUsername: username,
            radiusPassword: password,
            startsAt,
            expiresAt,
            packageId: pkg.id,
          },
        })
      : await prisma.subscription.create({
          data: {
            customerId: payment.customerId,
            packageId: pkg.id,
            deviceId: payment.deviceId,
            paymentId: payment.id,
            status: subStatus,
            renewalMode,
            radiusUsername: username,
            radiusPassword: password,
            startsAt,
            expiresAt,
          },
        });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "ACTIVATED",
        activatedAt: now,
        radiusProvisionedAt: subStatus === "ACTIVE" ? now : null,
      },
    });

    await writeAudit({
      actorType: "system",
      action: "payment.activated",
      entityType: "payment",
      entityId: payment.id,
      after: { subscriptionId: subscription.id, status: subStatus, username },
      requestId,
    });

    return {
      subscriptionId: subscription.id,
      username,
      password,
      expiresAt,
      startsAt,
    };
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "ACTIVATION_FAILED",
        failureReason: err instanceof Error ? err.message : "activation failed",
      },
    });
    await writeAudit({
      actorType: "system",
      action: "payment.activation_failed",
      entityType: "payment",
      entityId: payment.id,
      after: { error: err instanceof Error ? err.message : String(err) },
      requestId,
    });
    throw err;
  }
}

export async function expireDueSubscriptions(prisma: PrismaClient, requestId?: string) {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { device: true },
  });
  for (const sub of due) {
    await revokeRadiusUser(prisma, sub.radiusUsername);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    await writeAudit({
      actorType: "system",
      action: "subscription.expired",
      entityType: "subscription",
      entityId: sub.id,
      requestId,
    });
    const queued = await prisma.subscription.findFirst({
      where: {
        customerId: sub.customerId,
        deviceId: sub.deviceId,
        status: "QUEUED",
        startsAt: { lte: now },
      },
      orderBy: { startsAt: "asc" },
      include: { package: true },
    });
    if (queued) {
      const remaining = Math.max(1, Math.floor((queued.expiresAt.getTime() - now.getTime()) / 1000));
      await provisionRadiusUser(prisma, {
        username: queued.radiusUsername,
        password: queued.radiusPassword,
        expiresAt: queued.expiresAt,
        sessionTimeout: remaining,
        downloadKbps: queued.package.downloadKbps,
        uploadKbps: queued.package.uploadKbps,
        simultaneousUse: queued.package.simultaneousUse,
      });
      await prisma.subscription.update({
        where: { id: queued.id },
        data: { status: "ACTIVE" },
      });
    }
  }
  return due.length;
}

export async function revokeSubscription(prisma: PrismaClient, subscriptionId: string, actor?: { id: string; email: string }, requestId?: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Subscription not found");
  await revokeRadiusUser(prisma, sub.radiusUsername);
  try {
    await getMikrotikAdapter().disconnectByMac(
      {
        id: sub.deviceId,
        name: "",
        host: "",
        apiPort: 8728,
        apiUsername: "",
        apiPassword: "",
      },
      "",
    );
  } catch {
    // RADIUS revoke is the source of truth
  }
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await writeAudit({
    actorType: actor ? "admin" : "system",
    actorId: actor?.id,
    actorEmail: actor?.email,
    action: "subscription.revoked",
    entityType: "subscription",
    entityId: subscriptionId,
    requestId,
  });
}
