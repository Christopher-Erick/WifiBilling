"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatKes } from "@/lib/utils";
import { Copy, ShieldCheck, Smartphone } from "lucide-react";

type Credentials = {
  username: string;
  password: string;
  loginUrl: string | null;
  dst: string | null;
  status: string;
  expiresAt: string;
};

type PaymentView = {
  paymentId: string;
  status: string;
  amountKes: number;
  phone: string;
  packageName: string;
  durationSeconds: number;
  accountReference: string | null;
  paybillNumber: string;
  stkEnabled: boolean;
  brandName: string;
  supportPhone: string;
  mock: boolean;
  failureReason: string | null;
  credentials: Credentials | null;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold tracking-wide">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()} aria-label={`Copy ${label}`}>
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function statusCopy(status: string) {
  if (status === "STK_SENT") return "Enter your M-Pesa PIN";
  if (status === "INITIATED") return "Sending M-Pesa prompt";
  if (["PAID", "ACTIVATING"].includes(status)) return "Payment received — turning on Wi-Fi";
  if (status === "ACTIVATED") return "You are paid";
  if (status === "STK_FAILED") return "Phone prompt did not complete";
  if (["FAILED", "CANCELLED", "ACTIVATION_FAILED"].includes(status)) return "Payment did not go through";
  return status.replaceAll("_", " ");
}

export function PaymentStatusClient({ initial }: { initial: PaymentView }) {
  const [payment, setPayment] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [stkPending, setStkPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  const waiting = ["INITIATED", "STK_SENT", "PAID", "ACTIVATING", "STK_FAILED"].includes(payment.status);
  const ready = payment.status === "ACTIVATED" && payment.credentials;
  const failed = ["FAILED", "CANCELLED", "ACTIVATION_FAILED"].includes(payment.status);
  const showStkRetry =
    waiting && payment.status !== "PAID" && payment.status !== "ACTIVATING" && payment.status !== "STK_SENT";

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/customer/payments/${payment.paymentId}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) setPayment((prev) => ({ ...prev, ...data }));
      } catch {
        /* keep last good state */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [waiting, payment.paymentId]);

  async function sendStk() {
    setError(null);
    setStkPending(true);
    try {
      const res = await fetch(`/api/v1/customer/payments/${payment.paymentId}/stk`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send the M-Pesa prompt.");
        return;
      }
      setPayment((prev) => ({ ...prev, status: data.status }));
    } catch {
      setError("No network. You can still pay manually to Paybill.");
    } finally {
      setStkPending(false);
    }
  }

  async function completeDemo() {
    setError(null);
    setDemoPending(true);
    try {
      const res = await fetch(`/api/v1/customer/payments/${payment.paymentId}/demo-complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Demo payment failed.");
        return;
      }
      const refresh = await fetch(`/api/v1/customer/payments/${payment.paymentId}`, { cache: "no-store" });
      const next = await refresh.json();
      if (refresh.ok) setPayment((prev) => ({ ...prev, ...next }));
    } catch {
      setError("Demo payment could not complete.");
    } finally {
      setDemoPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{statusCopy(payment.status)}</CardTitle>
          <CardDescription>
            {payment.packageName} · {formatKes(payment.amountKes)} · {formatDuration(payment.durationSeconds)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {waiting && payment.status !== "PAID" && payment.status !== "ACTIVATING" && (
            <div className="space-y-3 rounded-xl bg-primary/5 p-4">
              <p className="text-sm font-medium">Check {payment.phone} for the M-Pesa PIN prompt.</p>
              <p className="text-sm text-muted-foreground">
                Enter your PIN on the phone. This page updates when Safaricom confirms. Money goes to Paybill{" "}
                {payment.paybillNumber || "for this Wi-Fi"} (Equity Bank settlement).
              </p>
              {showStkRetry && (
                <Button className="w-full" size="lg" type="button" disabled={stkPending} onClick={() => void sendStk()}>
                  <Smartphone className="h-4 w-4" />
                  {stkPending ? "Sending prompt…" : "Send M-Pesa prompt again"}
                </Button>
              )}
            </div>
          )}

          {payment.status === "STK_FAILED" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
              The phone prompt did not complete. Send it again, or pay manually to Paybill using the details below.
            </p>
          )}

          {waiting && (
            <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-medium">Or pay manually</p>
              <p className="text-sm text-muted-foreground">
                On your phone: M-Pesa → Lipa na M-Pesa → Pay Bill. Use the same Paybill the prompt uses.
              </p>
              <div className="space-y-2">
                <CopyField label="Paybill number" value={payment.paybillNumber || "Ask attendant"} />
                <CopyField label="Account number" value={payment.accountReference || "—"} />
                <CopyField label="Amount" value={String(payment.amountKes)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Typing the account number here does not pay. Wait for M-Pesa to confirm.
              </p>
            </div>
          )}

          {waiting && payment.mock && (
            <div className="rounded-lg border border-dashed border-accent/40 p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Demo mode — no real money moves. Use this instead of a live PIN prompt.
              </p>
              <Button className="w-full" variant="accent" type="button" disabled={demoPending} onClick={() => void completeDemo()}>
                {demoPending ? "Completing…" : "Complete demo payment"}
              </Button>
            </div>
          )}

          {["PAID", "ACTIVATING"].includes(payment.status) && (
            <p className="text-sm text-primary">Payment received. Turning on your Wi-Fi now…</p>
          )}

          {failed && (
            <div className="space-y-3">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
                {payment.failureReason || "Payment did not complete. You were not charged for Wi-Fi on this order."}
              </p>
              <Button className="w-full" asChild>
                <Link href="/portal">Try another package</Link>
              </Button>
            </div>
          )}

          {ready && payment.credentials && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <p className="font-medium">You are online after you connect</p>
              </div>
              {payment.credentials.loginUrl ? (
                <form method="post" action={payment.credentials.loginUrl}>
                  <input type="hidden" name="username" value={payment.credentials.username} />
                  <input type="hidden" name="password" value={payment.credentials.password} />
                  <input type="hidden" name="dst" value={payment.credentials.dst || ""} />
                  <Button className="w-full" size="lg" type="submit">
                    Connect me now
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Payment is confirmed. If this page was opened on the Wi-Fi login screen, tap back and you should be
                  online. Keep these details if you reconnect later.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Username {payment.credentials.username} · valid until{" "}
                {new Date(payment.credentials.expiresAt).toLocaleString("en-KE")}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {payment.supportPhone ? (
            <p className="text-xs text-muted-foreground">Need help? Call {payment.supportPhone}.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
