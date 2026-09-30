"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKes } from "@/lib/utils";
import { HOTSPOT_PARAM_KEYS, pickHotspotParams } from "@/lib/hotspot";
import { Wifi } from "lucide-react";
import type { PortalConfig } from "@/lib/settings";
import type { PublicPackage } from "@/lib/packages";

export function PortalClient({
  initialPackages = [],
  config,
}: {
  initialPackages?: PublicPackage[];
  config: PortalConfig;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const hotspot = useMemo(() => {
    const raw: Record<string, string> = {};
    for (const key of HOTSPOT_PARAM_KEYS) {
      const v = search.get(key);
      if (v) raw[key] = v;
    }
    return pickHotspotParams(raw);
  }, [search]);

  const [selected, setSelected] = useState<string>(initialPackages[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const chosen = initialPackages.find((p) => p.id === selected);

  async function startPay(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/v1/customer/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          packageId: chosen.id,
          method: "paybill",
          hotspot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start payment. Try again.");
        return;
      }
      router.push(`/portal/status/${data.paymentId}`);
    } catch {
      setError("No network. Check you are on this Wi-Fi and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6 sm:py-10">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wifi className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{config.brandName}</p>
          <h1 className="text-2xl font-semibold leading-tight">Pay with M-Pesa, get Wi-Fi</h1>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        Choose a package, enter your Safaricom number, then pay to Paybill. Wi-Fi turns on after M-Pesa confirms — not
        when you type the account number.
      </p>

      <form onSubmit={(e) => void startPay(e)} className="space-y-4">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Choose a package</h2>
          {initialPackages.length === 0 && (
            <p className="rounded-xl border border-dashed border-accent/40 bg-card p-4 text-sm">
              No packages are on sale yet. Ask the attendant to add one, then refresh this page.
            </p>
          )}
          <div className="grid gap-3">
            {initialPackages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`block w-full rounded-xl border p-4 text-left shadow-sm transition ${
                  selected === p.id ? "border-primary bg-white ring-2 ring-primary/40" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.durationLabel} · {p.speedLabel}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-primary">{formatKes(p.priceKes)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {chosen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Your M-Pesa number</CardTitle>
              <CardDescription>
                {chosen.name} · {formatKes(chosen.priceKes)} for {chosen.durationLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="phone">Safaricom number</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                required
                minLength={9}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button className="w-full" size="lg" type="submit" disabled={pending || !phone.trim()}>
                {pending ? "Preparing Paybill…" : "Continue to Paybill"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Next screen shows Paybill {config.paybillNumber || "number"}, your account, and the exact amount.
                {config.stkEnabled ? " You can also send an M-Pesa prompt to this phone." : ""}
              </p>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
