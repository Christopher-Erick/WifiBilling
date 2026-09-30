import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";
import { applyStkCallback, initiateStkPayment, mockSuccessCallback } from "@/lib/payments/service";
import { expireDueSubscriptions } from "@/lib/subscriptions";
import { hasPermission } from "@/lib/rbac";
import { resetEnvCache } from "@/lib/env";

const prisma = new PrismaClient();

async function seedBase() {
  const pkg = await prisma.package.create({
    data: {
      name: "Test Hour",
      description: "Test package",
      priceKes: 20,
      durationSeconds: 3600,
      downloadKbps: 2048,
      uploadKbps: 1024,
      renewalMode: "EXTEND",
      isActive: true,
    },
  });
  const queuedPkg = await prisma.package.create({
    data: {
      name: "Test Queue",
      description: "Queue package",
      priceKes: 30,
      durationSeconds: 1800,
      downloadKbps: 1024,
      uploadKbps: 512,
      renewalMode: "QUEUE",
      isActive: true,
    },
  });
  const device = await prisma.mikrotikDevice.create({
    data: {
      name: "Test AP",
      siteName: "Lab",
      host: "10.9.9.1",
      apiUsername: "u",
      apiPassword: "p",
      radiusSecret: "secret",
      nasIdentifier: `lab-${Date.now()}`,
      isActive: true,
    },
  });
  await prisma.adminUser.create({
    data: {
      email: "readonly@test.local",
      name: "RO",
      role: "READ_ONLY",
      passwordHash: await hash("ChangeMe_Read1!"),
    },
  });
  return { pkg, queuedPkg, device };
}

describe("payments + subscriptions integration", () => {
  let pkgId: string;
  let queuePkgId: string;
  let deviceId: string;

  beforeAll(async () => {
    resetEnvCache();
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });
    await prisma.$executeRawUnsafe("TRUNCATE TABLE subscriptions, payments, customers, packages, mikrotik_devices, admin_users, radcheck, radreply, audit_logs RESTART IDENTITY CASCADE");
    const seeded = await seedBase();
    pkgId = seeded.pkg.id;
    queuePkgId = seeded.queuedPkg.id;
    deviceId = seeded.device.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("initiates STK, pays once, ignores duplicate callback, writes RADIUS", async () => {
    const started = await initiateStkPayment(prisma, {
      phone: "0712000001",
      packageId: pkgId,
      deviceId,
      hotspot: { mac: "AA:BB:CC:DD:EE:01", "link-login-only": "http://10.5.50.1/login" },
    });
    expect(started.payment.status).toBe("STK_SENT");
    expect(started.payment.checkoutRequestId).toBeTruthy();

    const cb = mockSuccessCallback(
      started.payment.checkoutRequestId!,
      started.payment.amountKes,
      started.payment.phone,
      started.payment.merchantRequestId || "m",
    );
    const first = await applyStkCallback(prisma, cb);
    expect(first.duplicate).toBe(false);
    expect(first.status).toBe("ACTIVATED");

    const second = await applyStkCallback(prisma, cb);
    expect(second.duplicate).toBe(true);

    const payment = await prisma.payment.findUnique({
      where: { id: started.payment.id },
      include: { subscription: true },
    });
    expect(payment?.status).toBe("ACTIVATED");
    const checks = await prisma.radCheck.findMany({ where: { username: payment!.subscription!.radiusUsername } });
    expect(checks.some((c) => c.attribute === "Cleartext-Password")).toBe(true);
    expect(await prisma.payment.count({ where: { id: started.payment.id } })).toBe(1);
  });

  it("rejects amount mismatch and does not grant access", async () => {
    const started = await initiateStkPayment(prisma, {
      phone: "0712000002",
      packageId: pkgId,
      deviceId,
      hotspot: {},
    });
    const cb = mockSuccessCallback(
      started.payment.checkoutRequestId!,
      started.payment.amountKes + 5,
      started.payment.phone,
    );
    const result = await applyStkCallback(prisma, cb);
    expect(result.status).toBe("FAILED");
    const payment = await prisma.payment.findUnique({
      where: { id: started.payment.id },
      include: { subscription: true },
    });
    expect(payment?.subscription).toBeNull();
    expect(payment?.status).toBe("FAILED");
  });

  it("EXTEND adds time on the same RADIUS user", async () => {
    const a = await initiateStkPayment(prisma, {
      phone: "0712000003",
      packageId: pkgId,
      deviceId,
      hotspot: {},
    });
    await applyStkCallback(
      prisma,
      mockSuccessCallback(a.payment.checkoutRequestId!, a.payment.amountKes, a.payment.phone),
    );
    const first = await prisma.subscription.findFirst({ where: { paymentId: a.payment.id } });
    const b = await initiateStkPayment(prisma, {
      phone: "0712000003",
      packageId: pkgId,
      deviceId,
      hotspot: {},
    });
    await applyStkCallback(
      prisma,
      mockSuccessCallback(b.payment.checkoutRequestId!, b.payment.amountKes, b.payment.phone),
    );
    const firstAfter = await prisma.subscription.findUnique({ where: { id: first!.id } });
    const second = await prisma.subscription.findFirst({ where: { paymentId: b.payment.id } });
    expect(firstAfter!.expiresAt.getTime()).toBeGreaterThan(first!.expiresAt.getTime());
    expect(second!.radiusUsername).toBe(first!.radiusUsername);
  });

  it("QUEUE starts after the current subscription", async () => {
    const a = await initiateStkPayment(prisma, {
      phone: "0712000004",
      packageId: pkgId,
      deviceId,
      hotspot: {},
    });
    await applyStkCallback(
      prisma,
      mockSuccessCallback(a.payment.checkoutRequestId!, a.payment.amountKes, a.payment.phone),
    );
    const active = await prisma.subscription.findFirst({ where: { paymentId: a.payment.id } });
    const b = await initiateStkPayment(prisma, {
      phone: "0712000004",
      packageId: queuePkgId,
      deviceId,
      hotspot: {},
    });
    await applyStkCallback(
      prisma,
      mockSuccessCallback(b.payment.checkoutRequestId!, b.payment.amountKes, b.payment.phone),
    );
    const queued = await prisma.subscription.findFirst({ where: { paymentId: b.payment.id } });
    expect(queued?.status).toBe("QUEUED");
    expect(Math.abs(queued!.startsAt.getTime() - active!.expiresAt.getTime())).toBeLessThan(1000);
  });

  it("expiry revokes RADIUS attributes", async () => {
    const a = await initiateStkPayment(prisma, {
      phone: "0712000005",
      packageId: pkgId,
      deviceId,
      hotspot: {},
    });
    await applyStkCallback(
      prisma,
      mockSuccessCallback(a.payment.checkoutRequestId!, a.payment.amountKes, a.payment.phone),
    );
    const sub = await prisma.subscription.findFirst({ where: { paymentId: a.payment.id } });
    await prisma.subscription.update({
      where: { id: sub!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const n = await expireDueSubscriptions(prisma);
    expect(n).toBeGreaterThanOrEqual(1);
    const leftover = await prisma.radCheck.count({ where: { username: sub!.radiusUsername } });
    expect(leftover).toBe(0);
    const updated = await prisma.subscription.findUnique({ where: { id: sub!.id } });
    expect(updated?.status).toBe("EXPIRED");
  });

  it("enforces READ_ONLY cannot write packages", () => {
    expect(hasPermission("READ_ONLY", "packages:write")).toBe(false);
    expect(hasPermission("ADMIN", "packages:write")).toBe(true);
  });
});
