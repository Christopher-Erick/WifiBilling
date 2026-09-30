"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Device = {
  id: string;
  name: string;
  siteName: string;
  host: string;
  nasIdentifier: string;
  isActive: boolean;
};

export default function DevicesPage() {
  const [rows, setRows] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    siteName: "",
    host: "",
    nasIdentifier: "",
    apiUsername: "billing",
    apiPassword: "",
    radiusSecret: "",
  });

  async function load() {
    const res = await fetch("/api/v1/admin/devices");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setRows(data.devices);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/devices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm({ ...form, name: "", host: "", nasIdentifier: "", apiPassword: "", radiusSecret: "" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Routers</h1>
        <p className="text-sm text-muted-foreground">Each HotSpot is a first-class device. Never assume there is only one MikroTik.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Register a MikroTik</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void create(e)}>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Site</Label>
              <Input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Management IP / host</Label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>NAS identifier</Label>
              <Input value={form.nasIdentifier} onChange={(e) => setForm({ ...form, nasIdentifier: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>API user</Label>
              <Input value={form.apiUsername} onChange={(e) => setForm({ ...form, apiUsername: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>API password</Label>
              <Input type="password" value={form.apiPassword} onChange={(e) => setForm({ ...form, apiPassword: e.target.value })} required />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>RADIUS secret</Label>
              <Input type="password" value={form.radiusSecret} onChange={(e) => setForm({ ...form, radiusSecret: e.target.value })} required />
            </div>
            <Button className="sm:col-span-2" type="submit">
              Add router
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {rows.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-5">
              <p className="font-semibold">{d.name}</p>
              <p className="text-sm text-muted-foreground">
                {d.siteName} · {d.host} · NAS {d.nasIdentifier} · {d.isActive ? "active" : "disabled"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
