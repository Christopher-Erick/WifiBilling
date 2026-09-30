"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Sub = {
  id: string;
  status: string;
  radiusUsername: string;
  startsAt: string;
  expiresAt: string;
  package: { name: string };
  device: { name: string };
  customer: { phone: string };
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/admin/subscriptions");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setRows(data.subscriptions);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function revoke(id: string) {
    const res = await fetch("/api/v1/admin/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: "revoke" }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Access windows</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Package</th>
                <th className="pb-2">Router</th>
                <th className="pb-2">Expires</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 font-mono">{s.customer.phone}</td>
                  <td className="py-2">{s.package.name}</td>
                  <td className="py-2">{s.device.name}</td>
                  <td className="py-2">{new Date(s.expiresAt).toLocaleString()}</td>
                  <td className="py-2">
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    {s.status === "ACTIVE" ? (
                      <Button size="sm" variant="destructive" onClick={() => void revoke(s.id)}>
                        Revoke
                      </Button>
                    ) : null}
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
