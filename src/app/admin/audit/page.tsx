"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Log = {
  id: string;
  action: string;
  actorEmail: string | null;
  actorType: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  requestId: string | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/admin/audit")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setRows(d.logs);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Append-only. There is no edit or delete API.</p>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((l) => (
            <div key={l.id} className="border-b border-border pb-3 text-sm last:border-0">
              <p className="font-medium">{l.action}</p>
              <p className="text-muted-foreground">
                {new Date(l.createdAt).toLocaleString()} · {l.actorType}
                {l.actorEmail ? ` (${l.actorEmail})` : ""} · {l.entityType}
                {l.entityId ? ` ${l.entityId}` : ""}
                {l.requestId ? ` · ${l.requestId}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
