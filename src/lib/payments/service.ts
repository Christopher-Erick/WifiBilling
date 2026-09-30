import type { Prisma, PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { normalizeKenyanPhone } from "@/lib/phone";
import { assertTransition, isCallbackDuplicate } from "@/lib/payments/machine";
import { getMpesaProvider } from "@/lib/mpesa";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { activatePayment } from "@/lib/subscriptions";
import { metadataValue, type C2bConfirmation, type StkCallback } from "@/lib/mpesa/types";
import type { HotspotParams } from "@/lib/hotspot";
import { createLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/redis";

const log = createLogger();

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export async function initiateStkPayment(
  prisma: PrismaClient,
  input: {
    phone: string;
    packageId: string;
    deviceId?: string;
    hotspot: HotspotParams;
    ip?: string;
    requestId?: string;
  },
) {
  const phone = normalizeKenyanPhone(input.phone);
  const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!pkg || !pkg.isActive) throw new PaymentError("Package is not available");

  let device = input.deviceId
    ? await prisma.mikrotikDevice.findUnique({ where: { id: input.deviceId } })
    : null;
  if (!device) {
    const identity = input.hotspot.identity || input.hotspot["server-name"] || input.hotspot.server;
    if (identity) {
      device = await prisma.mikrotikDevice.findFirst({
        where: { OR: [{ nasIdentifier: identity }, { name: identity }], isActive: true },
      });
    }
  }
  if (!device) {
    device = await prisma.mikrotikDevice.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  }
  if (!device) throw new PaymentError("No MikroTik device is configured");

  const rl = await rateLimit(`stk:${phone}`, 5, 10 * 60);
  if (!rl.ok) throw new PaymentError("Too many payment attempts. Wait a few minutes.");

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const env = getEnv();
  const callbackUrl = env.MPESA_CALLBACK_URL || `${env.APP_URL}/api/v1/webhooks/mpesa/stk`;
  const idempotencyKey = `stk:${phone}:${pkg.id}:${nanoid(8)}`;

  const payment = await prisma.payment.create({
    data: {
      customerId: customer.id,
      packageId: pkg.id,
      deviceId: device.id,
      channel: "STK_PUSH",
      status: "INITIATED",
      amountKes: pkg.priceKes,
      phone,
      idempotencyKey,
      hotspot: input.hotspot as Prisma.InputJsonValue,
    },
  });

  try {
    const provider = getMpesaProvider();
    const stk = await provider.stkPush({
      phone,
      amountKes: pkg.priceKes,
      accountReference: `WIFI${payment.id.slice(-8).toUpperCase()}`,
      transactionDesc: pkg.name,
      callbackUrl,
    });
    assertTransition("INITIATED", "STK_SENT");
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "STK_SENT",
        merchantRequestId: stk.merchantRequestId,
        checkoutRequestId: stk.checkoutRequestId,
      },
    });
    await writeAudit({
      actorType: "customer",
      actorId: customer.id,
      action: "payment.stk_sent",
      entityType: "payment",
      entityId: payment.id,
      ip: input.ip,
      requestId: input.requestId,
      after: { checkoutRequestId: stk.checkoutRequestId, amountKes: pkg.priceKes },
    });
    return { payment: updated, customerMessage: stk.customerMessage, mock: provider.name === "mock" };
  } catch (err) {
    assertTransition("INITIATED", "STK_FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "STK_FAILED",
        failureReason: err instanceof Error ? err.message : "STK failed",
      },
    });
    throw err;
  }
}

export async function applyStkCallback(
  prisma: PrismaClient,
  payload: StkCallback,
  requestId?: string,
): Promise<{ duplicate: boolean; paymentId: string; status: string }> {
  const cb = payload.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) throw new PaymentError("Invalid STK callback");

  const payment = await prisma.payment.findUnique({
    where: { checkoutRequestId: cb.CheckoutRequestID },
  });
  if (!payment) throw new PaymentError("Unknown CheckoutRequestID");

  if (isCallbackDuplicate(payment.status)) {
    log.info({ paymentId: payment.id, status: payment.status }, "duplicate stk callback ignored");
    return { duplicate: true, paymentId: payment.id, status: payment.status };
  }

  if (cb.ResultCode !== 0) {
    assertTransition(payment.status, "FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        resultCode: String(cb.ResultCode),
        resultDesc: cb.ResultDesc,
        rawCallback: payload as unknown as Prisma.InputJsonValue,
        failureReason: cb.ResultDesc,
      },
    });
    return { duplicate: false, paymentId: payment.id, status: "FAILED" };
  }

  const amount = Number(metadataValue(cb.CallbackMetadata?.Item, "Amount"));
  const receipt = String(metadataValue(cb.CallbackMetadata?.Item, "MpesaReceiptNumber") ?? "");
  const msisdn = String(metadataValue(cb.CallbackMetadata?.Item, "PhoneNumber") ?? payment.phone);

  if (amount !== payment.amountKes) {
    assertTransition(payment.status, "FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        resultCode: "AMOUNT_MISMATCH",
        resultDesc: `Callback amount ${amount} != ${payment.amountKes}`,
        rawCallback: payload as unknown as Prisma.InputJsonValue,
        failureReason: "Amount mismatch",
        mpesaReceipt: receipt || null,
      },
    });
    await writeAudit({
      actorType: "webhook",
      action: "payment.amount_mismatch",
      entityType: "payment",
      entityId: payment.id,
      after: { amount, expected: payment.amountKes },
      requestId,
    });
    return { duplicate: false, paymentId: payment.id, status: "FAILED" };
  }

  if (receipt) {
    const existingReceipt = await prisma.payment.findFirst({
      where: { mpesaReceipt: receipt, id: { not: payment.id } },
    });
    if (existingReceipt) {
      throw new PaymentError("M-Pesa receipt already used");
    }
  }

  assertTransition(payment.status, "PAID");
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      resultCode: String(cb.ResultCode),
      resultDesc: cb.ResultDesc,
      mpesaReceipt: receipt || `MOCK-${payment.id.slice(-8)}`,
      rawCallback: payload as unknown as Prisma.InputJsonValue,
      phone: (() => {
        try {
          return normalizeKenyanPhone(String(msisdn));
        } catch {
          return payment.phone;
        }
      })(),
    },
  });

  await writeAudit({
    actorType: "webhook",
    action: "payment.paid",
    entityType: "payment",
    entityId: payment.id,
    after: { receipt, amount },
    requestId,
  });

  const activated = await activatePayment(prisma, payment.id, requestId);
  return { duplicate: false, paymentId: payment.id, status: "ACTIVATED", ...activated };
}

export async function applyC2bConfirmation(
  prisma: PrismaClient,
  payload: C2bConfirmation,
  requestId?: string,
) {
  const receipt = payload.TransID;
  const existing = await prisma.payment.findFirst({ where: { mpesaReceipt: receipt } });
  if (existing) {
    return { duplicate: true, paymentId: existing.id, status: existing.status };
  }

  const phone = normalizeKenyanPhone(payload.MSISDN);
  const amount = Math.round(Number(payload.TransAmount));
  const ref = (payload.BillRefNumber || "").trim();

  let payment = await prisma.payment.findFirst({
    where: {
      phone,
      amountKes: amount,
      status: { in: ["INITIATED", "STK_SENT", "STK_FAILED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment && ref) {
    payment = await prisma.payment.findFirst({
      where: { id: { endsWith: ref.replace(/^WIFI/i, "") } },
    });
  }

  if (!payment) {
    await writeAudit({
      actorType: "webhook",
      action: "payment.c2b_unmatched",
      entityType: "payment",
      after: { receipt, phone, amount, ref },
      requestId,
    });
    throw new PaymentError("No matching pending payment for this Paybill deposit");
  }

  if (isCallbackDuplicate(payment.status)) {
    return { duplicate: true, paymentId: payment.id, status: payment.status };
  }

  assertTransition(payment.status, "PAID");
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      channel: "C2B_PAYBILL",
      mpesaReceipt: receipt,
      resultCode: "0",
      resultDesc: "C2B confirmation",
      rawCallback: payload as unknown as Prisma.InputJsonValue,
    },
  });
  await activatePayment(prisma, payment.id, requestId);
  return { duplicate: false, paymentId: payment.id, status: "ACTIVATED" };
}

export async function queryPendingStk(prisma: PrismaClient) {
  const pending = await prisma.payment.findMany({
    where: { status: "STK_SENT", checkoutRequestId: { not: null } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  const provider = getMpesaProvider();
  let completed = 0;
  for (const p of pending) {
    if (!p.checkoutRequestId) continue;
    const result = await provider.queryStk(p.checkoutRequestId);
    if (result.resultCode === "0") {
      await applyStkCallback(prisma, {
        Body: {
          stkCallback: {
            MerchantRequestID: p.merchantRequestId || "",
            CheckoutRequestID: p.checkoutRequestId,
            ResultCode: 0,
            ResultDesc: result.resultDesc,
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: p.amountKes },
                { Name: "MpesaReceiptNumber", Value: `QRY-${p.id.slice(-8)}` },
                { Name: "PhoneNumber", Value: Number(p.phone) },
              ],
            },
          },
        },
      });
      completed += 1;
    } else if (
      provider.name !== "mock" &&
      (result.resultCode === "1032" || result.resultCode === "1037" || result.resultCode === "1") &&
      Date.now() - p.createdAt.getTime() > 90_000
    ) {
      assertTransition(p.status, "FAILED");
      await prisma.payment.update({
        where: { id: p.id },
        data: { status: "FAILED", resultCode: result.resultCode, resultDesc: result.resultDesc, failureReason: result.resultDesc },
      });
    }
  }
  return { scanned: pending.length, completed };
}

export async function retryActivation(prisma: PrismaClient, paymentId: string, requestId?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new PaymentError("Payment not found");
  if (payment.status !== "PAID" && payment.status !== "ACTIVATION_FAILED") {
    throw new PaymentError("Payment is not waiting for activation");
  }
  return activatePayment(prisma, paymentId, requestId);
}

export function mockSuccessCallback(checkoutRequestId: string, amountKes: number, phone: string, merchantRequestId = "mock"): StkCallback {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amountKes },
            { Name: "MpesaReceiptNumber", Value: `MOCK${nanoid(8).toUpperCase()}` },
            { Name: "PhoneNumber", Value: Number(phone) },
          ],
        },
      },
    },
  };
}
