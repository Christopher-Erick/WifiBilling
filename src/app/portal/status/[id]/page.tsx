import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isMockMpesa } from "@/lib/env";
import { loginActionUrl, type HotspotParams } from "@/lib/hotspot";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { completeMockPaymentAction } from "@/app/portal/actions";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { subscription: true, package: true, device: true },
  });
  if (!payment) notFound();
  const hotspot = (payment.hotspot ?? {}) as HotspotParams;
  const waiting = ["STK_SENT", "INITIATED", "PAID", "ACTIVATING"].includes(payment.status);
  const ready = payment.status === "ACTIVATED" && payment.subscription;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
      {waiting ? <meta httpEquiv="refresh" content="3" /> : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment
            <Badge variant={statusVariant(payment.status)}>{payment.status.replaceAll("_", " ")}</Badge>
          </CardTitle>
          <CardDescription>
            {formatKes(payment.amountKes)} · {payment.package.name} · {payment.device.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {waiting && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Enter your M-Pesa PIN on {payment.phone}.</p>
              <p className="mt-1 text-muted-foreground">This page refreshes when Safaricom confirms the payment.</p>
              {isMockMpesa() && (
                <form action={completeMockPaymentAction} className="mt-3">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <Button className="w-full" variant="accent" type="submit">
                    Complete demo payment
                  </Button>
                </form>
              )}
            </div>
          )}
          {payment.status === "FAILED" || payment.status === "STK_FAILED" ? (
            <p className="text-sm text-destructive">{payment.failureReason || "Payment did not complete."}</p>
          ) : null}
          {ready && payment.subscription && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <p className="font-medium">Access is ready</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
                <span className="text-muted-foreground">Username</span>
                <span>{payment.subscription.radiusUsername}</span>
                <span className="text-muted-foreground">Password</span>
                <span>{payment.subscription.radiusPassword}</span>
              </div>
              {loginActionUrl(hotspot) ? (
                <form method="post" action={loginActionUrl(hotspot)!}>
                  <input type="hidden" name="username" value={payment.subscription.radiusUsername} />
                  <input type="hidden" name="password" value={payment.subscription.radiusPassword} />
                  <input type="hidden" name="dst" value={hotspot.dst || hotspot["link-orig"] || ""} />
                  <Button className="w-full" size="lg" type="submit">
                    Connect me now
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  On a live HotSpot this button logs you into MikroTik. Copy the credentials if you reconnect later.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
