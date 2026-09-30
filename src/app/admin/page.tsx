"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

type Dash = {
  kpis: {
    todayRevenueKes: number;
    todayPayments: number;
    activeSubscriptions: number;
    paidNotActivated: number;
    activatedNotConfirmed: number;
    failedToday: number;
    activePackages: number;
    activeDevices: number;
  };
  recent: Array<{
    id: string;
    status: string;
    amountKes: number;
    phone: string;
    packageName: string;
    deviceName: string;
    createdAt: string;
  }>;
};

export default function AdminHomePage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/dashboard")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading overview…</p>;

  const cards = [
    { label: "Today's collections", value: formatKes(data.kpis.todayRevenueKes), hint: `${data.kpis.todayPayments} payments` },
    { label: "Active sessions", value: String(data.kpis.activeSubscriptions), hint: `${data.kpis.activeDevices} routers` },
    { label: "Paid, not activated", value: String(data.kpis.paidNotActivated), hint: "Needs retry", href: "/admin/reconciliation" },
    { label: "Activated, not confirmed", value: String(data.kpis.activatedNotConfirmed), hint: "HotSpot login pending", href: "/admin/reconciliation" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Live billing health across every MikroTik device.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{c.value}</p>
              {c.href ? (
                <Link href={c.href} className="text-sm text-primary underline-offset-2 hover:underline">
                  {c.hint}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">{c.hint}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-2">When</th>
                <th className="pb-2">Phone</th>
                <th className="pb-2">Package</th>
                <th className="pb-2">Router</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="py-2 font-mono">{p.phone}</td>
                  <td className="py-2">{p.packageName}</td>
                  <td className="py-2">{p.deviceName}</td>
                  <td className="py-2">{formatKes(p.amountKes)}</td>
                  <td className="py-2">
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
