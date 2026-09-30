"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, formatKes } from "@/lib/utils";

type Pkg = {
  id: string;
  name: string;
  description: string;
  priceKes: number;
  durationSeconds: number;
  downloadKbps: number;
  uploadKbps: number;
  renewalMode: string;
  isActive: boolean;
};

export default function PackagesPage() {
  const [rows, setRows] = useState<Pkg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceKes: 20,
    durationSeconds: 3600,
    downloadKbps: 2048,
    uploadKbps: 1024,
    renewalMode: "EXTEND",
  });

  async function load() {
    const res = await fetch("/api/v1/admin/packages");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setRows(data.packages);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/packages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, priceKes: Number(form.priceKes), durationSeconds: Number(form.durationSeconds), downloadKbps: Number(form.downloadKbps), uploadKbps: Number(form.uploadKbps) }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm({ ...form, name: "", description: "" });
    await load();
  }

  async function toggle(p: Pkg) {
    const res = await fetch(`/api/v1/admin/packages/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Packages</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>New package</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void create(e)}>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Price (KES)</Label>
              <Input type="number" value={form.priceKes} onChange={(e) => setForm({ ...form, priceKes: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Duration (seconds)</Label>
              <Input type="number" value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Renewal</Label>
              <select
                className="h-11 w-full rounded-md border border-border bg-white px-3"
                value={form.renewalMode}
                onChange={(e) => setForm({ ...form, renewalMode: e.target.value })}
              >
                <option value="EXTEND">EXTEND remaining time</option>
                <option value="QUEUE">QUEUE after current sub</option>
              </select>
            </div>
            <Button className="sm:col-span-2" type="submit">
              Save package
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {rows.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">
                  {p.name} · {formatKes(p.priceKes)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {p.description} · {formatDuration(p.durationSeconds)} · {p.renewalMode} · {p.isActive ? "on sale" : "hidden"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void toggle(p)}>
                {p.isActive ? "Hide" : "Show"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
