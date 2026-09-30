"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [form, setForm] = useState({
    brand_name: "LipaWiFi",
    support_phone: "",
    default_renewal_mode: "EXTEND",
    paybill_number: "",
    stk_enabled: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/settings")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setForm((f) => ({
          ...f,
          brand_name: String(d.settings.brand_name ?? f.brand_name),
          support_phone: String(d.settings.support_phone ?? ""),
          default_renewal_mode: String(d.settings.default_renewal_mode ?? "EXTEND"),
          paybill_number: String(d.settings.paybill_number ?? ""),
          stk_enabled: d.settings.stk_enabled !== false && d.settings.stk_enabled !== "false",
        }));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/v1/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setMessage("Saved.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-primary">{message}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Operator defaults</CardTitle>
          <CardDescription>
            Paybill is the customer payment path. Safaricom settles that Paybill to the Equity Bank account linked on
            the shortcode — LipaWiFi never sees bank credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-lg gap-3" onSubmit={(e) => void save(e)}>
            <div className="space-y-1">
              <Label>Brand name</Label>
              <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Support phone</Label>
              <Input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>M-Pesa Paybill number</Label>
              <Input
                value={form.paybill_number}
                onChange={(e) => setForm({ ...form, paybill_number: e.target.value })}
                placeholder="Shown on the customer portal"
              />
              <p className="text-xs text-muted-foreground">
                Same shortcode you registered with Safaricom / Daraja. Must match MPESA_PAYBILL (or MPESA_SHORTCODE) in
                the server environment.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Default renewal</Label>
              <select
                className="h-11 w-full rounded-md border border-border bg-white px-3"
                value={form.default_renewal_mode}
                onChange={(e) => setForm({ ...form, default_renewal_mode: e.target.value })}
              >
                <option value="EXTEND">Add time on the same session</option>
                <option value="QUEUE">Start after the current session</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.stk_enabled}
                onChange={(e) => setForm({ ...form, stk_enabled: e.target.checked })}
              />
              Offer “Send M-Pesa prompt to my phone” (optional STK). Paybill stays the default.
            </label>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
