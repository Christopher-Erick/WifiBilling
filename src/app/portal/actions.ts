"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { initiateCustomerPayment, applyC2bConfirmation, mockC2bConfirmation } from "@/lib/payments/service";
import { pickHotspotParams, HOTSPOT_PARAM_KEYS } from "@/lib/hotspot";
import { isMockMpesa } from "@/lib/env";
import { getPortalConfig } from "@/lib/settings";

export async function startPaymentAction(_prev: { error?: string } | undefined, formData: FormData) {
  const phone = String(formData.get("phone") || "");
  const packageId = String(formData.get("packageId") || "");
  const raw: Record<string, string> = {};
  for (const key of HOTSPOT_PARAM_KEYS) {
    const value = formData.get(key);
    if (typeof value === "string" && value) raw[key] = value;
  }
  let paymentId: string;
  try {
    const result = await initiateCustomerPayment(prisma, {
      phone,
      packageId,
      hotspot: pickHotspotParams(raw),
      method: "stk",
    });
    paymentId = result.payment.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Payment failed" };
  }
  redirect(`/portal/status/${paymentId}`);
}

export async function completeMockPaymentAction(formData: FormData) {
  if (!isMockMpesa()) {
    throw new Error("Mock payment is disabled");
  }
  const paymentId = String(formData.get("paymentId") || "");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.accountReference) {
    throw new Error("Payment not found");
  }
  if (payment.status === "ACTIVATED") {
    redirect(`/portal/status/${paymentId}`);
  }
  const config = await getPortalConfig(prisma);
  await applyC2bConfirmation(
    prisma,
    mockC2bConfirmation({
      amountKes: payment.amountKes,
      phone: payment.phone,
      accountReference: payment.accountReference,
      paybillNumber: config.paybillNumber || "174379",
    }),
  );
  redirect(`/portal/status/${paymentId}`);
}
