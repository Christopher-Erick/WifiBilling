"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { displayPhone } from "@/lib/phone";

export default function CustomersPage() {
  const [rows, setRows] = useState<Array<{ id: string; phone: string; name: string | null; _count: { payments: number } }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/admin/customers")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setRows(d.customers);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      {error && <p className="text-destructive">{error}</p>}
      {rows.length === 0 && !error ? <p className="text-sm text-muted-foreground">No customers yet.</p> : null}
      {rows.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-5">
            <p className="font-mono font-medium">{displayPhone(c.phone)}</p>
            <p className="text-sm text-muted-foreground">
              {c.name || "Unnamed"} · {c._count.payments} payments
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
