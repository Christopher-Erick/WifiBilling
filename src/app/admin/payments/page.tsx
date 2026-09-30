"use client";

import { useEffect, useState } from "react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";

export default function PaymentsPage() {
  const [rows, setRows] = useState<Array<Record<string, string>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/admin/payments")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setRows(d.payments);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payments</h1>
      {error && <p className="text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!rows ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Router</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="py-2 font-mono">{p.phone}</td>
                    <td className="py-2">{p.packageName}</td>
                    <td className="py-2">{p.deviceName}</td>
                    <td className="py-2">{formatKes(Number(p.amountKes))}</td>
                    <td className="py-2 font-mono">{p.mpesaReceipt || "—"}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
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
