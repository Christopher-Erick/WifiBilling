import type { PrismaClient } from "@prisma/client";
import { rateLimitFromKbps } from "@/lib/utils";

export function radiusUsername(phone: string, deviceId: string): string {
  const short = deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toLowerCase();
  return `wf${phone}${short}`.slice(0, 32);
}

export function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function expirationString(expiresAt: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${expiresAt.getUTCDate()} ${month(expiresAt.getUTCMonth())} ${expiresAt.getUTCFullYear()} ${pad(expiresAt.getUTCHours())}:${pad(expiresAt.getUTCMinutes())}:${pad(expiresAt.getUTCSeconds())}`;
}

function month(i: number) {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i];
}

async function replaceAttribute(
  prisma: PrismaClient,
  table: "radCheck" | "radReply",
  username: string,
  attribute: string,
  op: string,
  value: string,
) {
  const data = { username, attribute, op, value };
  if (table === "radCheck") {
    await prisma.radCheck.deleteMany({ where: { username, attribute } });
    await prisma.radCheck.create({ data });
  } else {
    await prisma.radReply.deleteMany({ where: { username, attribute } });
    await prisma.radReply.create({ data });
  }
}

export async function provisionRadiusUser(
  prisma: PrismaClient,
  opts: {
    username: string;
    password: string;
    expiresAt: Date;
    sessionTimeout: number;
    downloadKbps: number;
    uploadKbps: number;
    simultaneousUse: number;
  },
) {
  await replaceAttribute(prisma, "radCheck", opts.username, "Cleartext-Password", ":=", opts.password);
  await replaceAttribute(prisma, "radCheck", opts.username, "Expiration", ":=", expirationString(opts.expiresAt));
  await replaceAttribute(prisma, "radCheck", opts.username, "Simultaneous-Use", ":=", String(opts.simultaneousUse));
  await replaceAttribute(prisma, "radReply", opts.username, "Session-Timeout", "=", String(opts.sessionTimeout));
  await replaceAttribute(
    prisma,
    "radReply",
    opts.username,
    "Mikrotik-Rate-Limit",
    "=",
    rateLimitFromKbps(opts.downloadKbps, opts.uploadKbps),
  );
  await replaceAttribute(prisma, "radReply", opts.username, "Idle-Timeout", "=", "600");
}

export async function revokeRadiusUser(prisma: PrismaClient, username: string) {
  await prisma.radCheck.deleteMany({ where: { username } });
  await prisma.radReply.deleteMany({ where: { username } });
  await prisma.radUserGroup.deleteMany({ where: { username } });
}

export async function syncNas(prisma: PrismaClient, device: { host: string; name: string; radiusSecret: string; nasIdentifier: string }) {
  const existing = await prisma.nas.findFirst({ where: { nasname: device.host } });
  if (existing) {
    await prisma.nas.update({
      where: { id: existing.id },
      data: {
        shortname: device.nasIdentifier.slice(0, 32),
        secret: device.radiusSecret,
        type: "mikrotik",
        description: device.name.slice(0, 200),
      },
    });
  } else {
    await prisma.nas.create({
      data: {
        nasname: device.host,
        shortname: device.nasIdentifier.slice(0, 32),
        type: "mikrotik",
        secret: device.radiusSecret,
        description: device.name.slice(0, 200),
      },
    });
  }
}
