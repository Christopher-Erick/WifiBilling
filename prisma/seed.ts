import "dotenv/config";
import { PrismaClient, Prisma, RenewalMode, Role } from "@prisma/client";
import { hash } from "argon2";
import { syncNas } from "../src/lib/radius";

const prisma = new PrismaClient();

async function upsertAdmin(email: string, name: string, role: Role, password: string) {
  const passwordHash = await hash(password);
  return prisma.adminUser.upsert({
    where: { email },
    update: { name, role, isActive: true, passwordHash },
    create: { email, name, role, isActive: true, passwordHash },
  });
}

async function main() {
  await upsertAdmin("admin@lipawifi.local", "Erik Admin", "SUPER_ADMIN", "ChangeMe_Admin1!");
  await upsertAdmin("finance@lipawifi.local", "Finance Desk", "FINANCE", "ChangeMe_Finance1!");
  await upsertAdmin("support@lipawifi.local", "Support Desk", "SUPPORT", "ChangeMe_Support1!");
  await upsertAdmin("netops@lipawifi.local", "Network Operator", "NETWORK_OPERATOR", "ChangeMe_Net1!");
  await upsertAdmin("readonly@lipawifi.local", "Read Only", "READ_ONLY", "ChangeMe_Read1!");

  const packages = [
    { name: "1 Hour", description: "Quick session for browsing and WhatsApp", priceKes: 20, durationSeconds: 3600, downloadKbps: 2048, uploadKbps: 1024, sortOrder: 10 },
    { name: "3 Hours", description: "Afternoon stretch with video-friendly speeds", priceKes: 30, durationSeconds: 3 * 3600, downloadKbps: 3072, uploadKbps: 1024, sortOrder: 20 },
    { name: "1 Day", description: "Full day access on this HotSpot", priceKes: 50, durationSeconds: 86400, downloadKbps: 4096, uploadKbps: 2048, sortOrder: 30 },
    { name: "1 Week", description: "Seven days, same router, auto-reconnect", priceKes: 200, durationSeconds: 7 * 86400, downloadKbps: 4096, uploadKbps: 2048, sortOrder: 40, renewalMode: "EXTEND" as RenewalMode },
    { name: "1 Month", description: "Best value for regulars at this site", priceKes: 500, durationSeconds: 30 * 86400, downloadKbps: 8192, uploadKbps: 4096, sortOrder: 50, renewalMode: "EXTEND" as RenewalMode },
  ];

  for (const pkg of packages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (existing) {
      await prisma.package.update({ where: { id: existing.id }, data: { ...pkg, isActive: true } });
    } else {
      await prisma.package.create({ data: { ...pkg, isActive: true } });
    }
  }

  const devices = [
    {
      name: "Westlands Cafe AP",
      siteName: "Westlands",
      host: "10.10.0.1",
      apiUsername: "billing",
      apiPassword: "change-me-api",
      radiusSecret: "westlands-radius-secret",
      nasIdentifier: "westlands-cafe",
      walledGarden: "lipawifi.local,safaricom.co.ke,sandbox.safaricom.co.ke",
    },
    {
      name: "Eastleigh Rooftop",
      siteName: "Eastleigh",
      host: "10.10.0.2",
      apiUsername: "billing",
      apiPassword: "change-me-api",
      radiusSecret: "eastleigh-radius-secret",
      nasIdentifier: "eastleigh-rooftop",
      walledGarden: "lipawifi.local,safaricom.co.ke",
    },
  ];

  for (const d of devices) {
    const existing = await prisma.mikrotikDevice.findUnique({ where: { nasIdentifier: d.nasIdentifier } });
    const row = existing
      ? await prisma.mikrotikDevice.update({ where: { id: existing.id }, data: { ...d, isActive: true } })
      : await prisma.mikrotikDevice.create({ data: { ...d, isActive: true } });
    await syncNas(prisma, row);
  }

  const customer = await prisma.customer.upsert({
    where: { phone: "254712345678" },
    update: { name: "Demo Customer" },
    create: { phone: "254712345678", name: "Demo Customer" },
  });

  const pkg = await prisma.package.findFirst({ where: { name: "1 Hour" } });
  const device = await prisma.mikrotikDevice.findFirst({ where: { nasIdentifier: "westlands-cafe" } });
  if (pkg && device) {
    const existingPaid = await prisma.payment.findFirst({ where: { idempotencyKey: "seed-paid-not-activated" } });
    if (!existingPaid) {
      await prisma.payment.create({
        data: {
          customerId: customer.id,
          packageId: pkg.id,
          deviceId: device.id,
          status: "PAID",
          amountKes: pkg.priceKes,
          phone: customer.phone,
          idempotencyKey: "seed-paid-not-activated",
          mpesaReceipt: "SEEDPAID1",
          hotspot: { mac: "4C:5E:0C:00:00:01", ip: "10.5.50.20" },
          failureReason: null,
        },
      });
    }
    const existingAct = await prisma.payment.findFirst({ where: { idempotencyKey: "seed-activated-not-confirmed" } });
    if (!existingAct) {
      const p = await prisma.payment.create({
        data: {
          customerId: customer.id,
          packageId: pkg.id,
          deviceId: device.id,
          status: "ACTIVATED",
          amountKes: pkg.priceKes,
          phone: customer.phone,
          idempotencyKey: "seed-activated-not-confirmed",
          mpesaReceipt: "SEEDACT1",
          hotspot: { mac: "4C:5E:0C:00:00:02", ip: "10.5.50.21" },
          activatedAt: new Date(),
          radiusProvisionedAt: new Date(),
          accessConfirmedAt: null,
        },
      });
      await prisma.subscription.create({
        data: {
          customerId: customer.id,
          packageId: pkg.id,
          deviceId: device.id,
          paymentId: p.id,
          status: "ACTIVE",
          renewalMode: "EXTEND",
          radiusUsername: "wf254712345678seed",
          radiusPassword: "demoPass12",
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    }
  }

  const settings: Record<string, Prisma.InputJsonValue> = {
    brand_name: "LipaWiFi",
    support_phone: "254700000000",
    default_renewal_mode: "EXTEND",
    paybill_number: "174379",
    stk_enabled: true,
    c2b_enabled: true,
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log("Seeded LipaWiFi demo data.");
  console.log("Admin login: admin@lipawifi.local / ChangeMe_Admin1!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
