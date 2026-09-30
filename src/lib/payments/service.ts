import type { Prisma, PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { normalizeKenyanPhone } from "@/lib/phone";
import { assertTransition, isCallbackDuplicate } from "@/lib/payments/machine";
import { generateAccountReference, normalizeBillRef } from "@/lib/payments/account-ref";
import { PaymentError } from "@/lib/payments/errors";
import { getPortalConfig } from "@/lib/settings";
import { getMpesaProvider } from "@/lib/mpesa";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { activatePayment } from "@/lib/subscriptions";
import { metadataValue, type C2bConfirmation, type StkCallback } from "@/lib/mpesa/types";
import type { HotspotParams } from "@/lib/hotspot";
import { createLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/redis";

export { PaymentError } from "@/lib/payments/errors";

const log = createLogger();

async function resolveDevice(
  prisma: PrismaClient,
  input: { deviceId?: string; hotspot: HotspotParams },
) {
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
  if (!device) throw new PaymentError("This Wi-Fi site is not set up yet. Ask the attendant for help.");
  return device;
}

export async function initiateCustomerPayment(
  prisma: PrismaClient,
  input: {
    phone: string;
    packageId: string;
    deviceId?: string;
    hotspot: HotspotParams;
    ip?: string;
    requestId?: string;
    method?: "paybill" | "stk";
  },
) {
  const phone = normalizeKenyanPhone(input.phone);
  const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!pkg || !pkg.isActive) throw new PaymentError("That package is not on sale right now.");

  const device = await resolveDevice(prisma, input);

  const rl = await rateLimit(`pay:${phone}`, 8, 10 * 60);
  if (!rl.ok) throw new PaymentError("Too many tries. Wait a few minutes and try again.");

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const accountReference = generateAccountReference();
  const method = input.method === "stk" ? "stk" : "paybill";
  const payment = await prisma.payment.create({
    data: {
      customerId: customer.id,
      packageId: pkg.id,
      deviceId: device.id,
      channel: "C2B_PAYBILL",
      status: "INITIATED",
      amountKes: pkg.priceKes,
      phone,
      accountReference,
      idempotencyKey: `pay:${phone}:${pkg.id}:${nanoid(10)}`,
      hotspot: input.hotspot as Prisma.InputJsonValue,
    },
  });

  await writeAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "payment.initiated",
    entityType: "payment",
    entityId: payment.id,
    ip: input.ip,
    requestId: input.requestId,
    after: { accountReference, amountKes: pkg.priceKes, method },
  });

  if (method === "stk") {
    return requestStkForPayment(prisma, payment.id, { ip: input.ip, requestId: input.requestId });
  }

  const config = await getPortalConfig(prisma);
  return {
    payment,
    mock: config.mock,
    customerMessage: "Pay with M-Pesa Paybill using the account number on the next screen.",
    paybillNumber: config.paybillNumber,
    accountReference,
  };
}

/** @deprecated Use initiateCustomerPayment. Kept so existing STK tests keep working. */
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
  return initiateCustomerPayment(prisma, { ...input, method: "stk" });
}

export async function requestStkForPayment(
  prisma: PrismaClient,
  paymentId: string,
  meta?: { ip?: string; requestId?: string },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { package: true, customer: true },
  });
  if (!payment) throw new PaymentError("Payment not found");
  if (isCallbackDuplicate(payment.status)) {
    return { payment, customerMessage: "This payment is already complete.", mock: getEnv().MPESA_PROVIDER === "mock" };
  }
  if (payment.status !== "INITIATED" && payment.status !== "STK_FAILED") {
    throw new PaymentError("A prompt cannot be sent for this payment.");
  }

  const config = await getPortalConfig(prisma);
  if (!config.stkEnabled) {
    throw new PaymentError("The M-Pesa phone prompt is not available. Use Paybill instead.");
  }

  const env = getEnv();
  const callbackUrl = env.MPESA_CALLBACK_URL || `${env.APP_URL}/api/v1/webhooks/mpesa/stk`;
  const accountReference = payment.accountReference || generateAccountReference();

  try {
    const provider = getMpesaProvider();
    const stk = await provider.stkPush({
      phone: payment.phone,
      amountKes: payment.amountKes,
      accountReference,
      transactionDesc: payment.package.name,
      callbackUrl,
    });
    assertTransition(payment.status, "STK_SENT");
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "STK_SENT",
        channel: "STK_PUSH",
        accountReference,
        merchantRequestId: stk.merchantRequestId,
        checkoutRequestId: stk.checkoutRequestId,
        failureReason: null,
      },
    });
    await writeAudit({
      actorType: "customer",
      actorId: payment.customerId,
      action: "payment.stk_sent",
      entityType: "payment",
      entityId: payment.id,
      ip: meta?.ip,
      requestId: meta?.requestId,
      after: { checkoutRequestId: stk.checkoutRequestId, amountKes: payment.amountKes, accountReference },
    });
    return { payment: updated, customerMessage: stk.customerMessage, mock: provider.name === "mock", accountReference };
  } catch (err) {
    assertTransition(payment.status, "STK_FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "STK_FAILED",
        failureReason: err instanceof Error ? err.message : "Could not send the M-Pesa prompt",
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
    assertTransition(payment.status, "STK_FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "STK_FAILED",
        resultCode: String(cb.ResultCode),
        resultDesc: cb.ResultDesc,
        rawCallback: payload as unknown as Prisma.InputJsonValue,
        failureReason: cb.ResultDesc,
      },
    });
    return { duplicate: false, paymentId: payment.id, status: "STK_FAILED" };
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
  const receipt = String(payload.TransID || "").trim();
  if (!receipt) throw new PaymentError("Missing TransID");

  const existing = await prisma.payment.findFirst({ where: { mpesaReceipt: receipt } });
  if (existing) {
    return { duplicate: true, unmatched: false, paymentId: existing.id, status: existing.status };
  }

  const ref = normalizeBillRef(payload.BillRefNumber);
  const amount = Math.round(Number(payload.TransAmount));

  if (!ref) {
    await writeAudit({
      actorType: "webhook",
      action: "payment.c2b_unmatched",
      entityType: "payment",
      after: { receipt, amount, reason: "empty_bill_ref" },
      requestId,
    });
    return { duplicate: false, unmatched: true, paymentId: null, status: "UNMATCHED" };
  }

  const payment = await prisma.payment.findFirst({
    where: { accountReference: { equals: ref, mode: "insensitive" } },
  });

  if (!payment) {
    await writeAudit({
      actorType: "webhook",
      action: "payment.c2b_unmatched",
      entityType: "payment",
      after: { receipt, amount, ref },
      requestId,
    });
    return { duplicate: false, unmatched: true, paymentId: null, status: "UNMATCHED" };
  }

  if (isCallbackDuplicate(payment.status)) {
    return { duplicate: true, unmatched: false, paymentId: payment.id, status: payment.status };
  }

  if (!Number.isFinite(amount) || amount !== payment.amountKes) {
    assertTransition(payment.status, "FAILED");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        channel: "C2B_PAYBILL",
        mpesaReceipt: receipt,
        resultCode: "AMOUNT_MISMATCH",
        resultDesc: `Paybill amount ${amount} != ${payment.amountKes}`,
        rawCallback: payload as unknown as Prisma.InputJsonValue,
        failureReason: "Amount mismatch",
      },
    });
    await writeAudit({
      actorType: "webhook",
      action: "payment.amount_mismatch",
      entityType: "payment",
      entityId: payment.id,
      after: { amount, expected: payment.amountKes, ref, receipt },
      requestId,
    });
    return { duplicate: false, unmatched: false, paymentId: payment.id, status: "FAILED" };
  }

  const config = await getPortalConfig(prisma);
  if (config.paybillNumber && payload.BusinessShortCode) {
    const got = String(payload.BusinessShortCode).trim();
    if (got && got !== String(config.paybillNumber).trim()) {
      log.warn({ got, expected: config.paybillNumber, paymentId: payment.id }, "c2b shortcode differs from configured paybill");
    }
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
  await writeAudit({
    actorType: "webhook",
    action: "payment.paid",
    entityType: "payment",
    entityId: payment.id,
    after: { receipt, amount, ref, channel: "C2B_PAYBILL" },
    requestId,
  });
  await activatePayment(prisma, payment.id, requestId);
  return { duplicate: false, unmatched: false, paymentId: payment.id, status: "ACTIVATED" };
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
      assertTransition(p.status, "STK_FAILED");
      await prisma.payment.update({
        where: { id: p.id },
        data: { status: "STK_FAILED", resultCode: result.resultCode, resultDesc: result.resultDesc, failureReason: result.resultDesc },
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

export function mockC2bConfirmation(input: {
  transId?: string;
  amountKes: number;
  phone: string;
  accountReference: string;
  paybillNumber: string;
}): C2bConfirmation {
  return {
    TransactionType: "Pay Bill",
    TransID: input.transId || `MOCK${nanoid(8).toUpperCase()}`,
    TransTime: new Date().toISOString().replace(/\D/g, "").slice(0, 14),
    TransAmount: String(input.amountKes),
    BusinessShortCode: input.paybillNumber,
    BillRefNumber: input.accountReference,
    MSISDN: input.phone,
    FirstName: "Demo",
  };
}
