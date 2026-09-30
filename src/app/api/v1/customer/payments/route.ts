import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, json, requestIdFrom, clientIp } from "@/lib/http";
import { initiateCustomerPayment } from "@/lib/payments/service";
import { hotspotParamsSchema } from "@/lib/hotspot";
import { isMockMpesa } from "@/lib/env";
import { getPortalConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().min(9),
  packageId: z.string().min(1),
  deviceId: z.string().optional(),
  method: z.enum(["paybill", "stk"]).optional(),
  hotspot: hotspotParamsSchema.optional(),
});

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  try {
    const body = bodySchema.parse(await req.json());
    const result = await initiateCustomerPayment(prisma, {
      phone: body.phone,
      packageId: body.packageId,
      deviceId: body.deviceId,
      hotspot: body.hotspot ?? {},
      ip: clientIp(req),
      requestId,
      method: body.method ?? "stk",
    });
    const config = await getPortalConfig(prisma);
    return json(
      {
        paymentId: result.payment.id,
        status: result.payment.status,
        amountKes: result.payment.amountKes,
        phone: result.payment.phone,
        accountReference: result.payment.accountReference,
        paybillNumber: config.paybillNumber,
        checkoutRequestId: result.payment.checkoutRequestId,
        customerMessage: result.customerMessage,
        mock: result.mock || isMockMpesa(),
        stkEnabled: config.stkEnabled,
        requestId,
      },
      { requestId },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
