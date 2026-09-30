"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

type Payment = {
  id: string;
  status: string;
  amountKes: number;
  phone: string;
  package: { name: string };
  device: { name: string };
  mpesaReceipt?: string | null;
  failureReason?: string | null;
  createdAt: string;
};

export default function ReconciliationPage() {
  const [paid, setPaid] = useState<Payment[]>([]);
  const [unconfirmed, setUnconfirmed] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/admin/reconciliation");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    setPaid(data.paidNotActivated);
    setUnconfirmed(data.activatedNotConfirmed);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function retry(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/payments/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/v1/admin/reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: id, action: "confirm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Paid-not-activated is money in without RADIUS. Activated-not-confirmed is provisioned access the client has not logged in yet.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Paid, not activated ({paid.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {paid.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is clear.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Router</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-mono">{p.phone}</td>
                    <td className="py-2">{p.package.name}</td>
                    <td className="py-2">{p.device.name}</td>
                    <td className="py-2">{formatKes(p.amountKes)}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button size="sm" disabled={busy === p.id} onClick={() => void retry(p.id)}>
                        Retry activation
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Activated, not confirmed ({unconfirmed.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {unconfirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is clear.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Router</th>
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {unconfirmed.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-mono">{p.phone}</td>
                    <td className="py-2">{p.package.name}</td>
                    <td className="py-2">{p.device.name}</td>
                    <td className="py-2 font-mono">{p.mpesaReceipt}</td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => void confirm(p.id)}>
                        Mark confirmed
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
