"use client";

import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, formatKes } from "@/lib/utils";
import { HOTSPOT_PARAM_KEYS, pickHotspotParams } from "@/lib/hotspot";
import { startPaymentAction } from "@/app/portal/actions";
import { Wifi, Smartphone } from "lucide-react";

type Pkg = {
  id: string;
  name: string;
  description: string;
  priceKes: number;
  durationSeconds: number;
  rateLimit: string;
};

export function PortalClient({ initialPackages = [] }: { initialPackages?: Pkg[] }) {
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
  const [state, action, pending] = useActionState(startPaymentAction, undefined);
  const chosen = initialPackages.find((p) => p.id === selected);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wifi className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">LipaWiFi</p>
          <h1 className="text-2xl font-semibold">Buy access, get online</h1>
        </div>
      </header>

      {hotspot.mac ? (
        <p className="text-xs text-muted-foreground">
          Device {hotspot.mac}
          {hotspot.ip ? ` · ${hotspot.ip}` : ""}
          {hotspot.identity ? ` · ${hotspot.identity}` : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Open this page from a MikroTik HotSpot for automatic login after payment. Demo works without a router.
        </p>
      )}

      <form action={action} className="space-y-4">
        {HOTSPOT_PARAM_KEYS.map((key) =>
          hotspot[key] ? <input key={key} type="hidden" name={key} value={hotspot[key]} /> : null,
        )}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Choose a package</h2>
          {initialPackages.length === 0 && (
            <p className="rounded-xl border border-dashed border-accent/40 bg-card p-4 text-sm">
              No packages are on sale yet. Ask the operator to publish one in Admin → Packages.
            </p>
          )}
          <div className="grid gap-3">
            {initialPackages.map((p) => (
              <label
                key={p.id}
                className={`block cursor-pointer rounded-xl border p-4 text-left shadow-sm transition has-[:checked]:border-primary has-[:checked]:bg-white has-[:checked]:ring-2 has-[:checked]:ring-primary/40 ${
                  selected === p.id ? "border-primary bg-white ring-2 ring-primary/40" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="packageId"
                  value={p.id}
                  className="sr-only"
                  defaultChecked={p.id === initialPackages[0]?.id}
                  onChange={() => setSelected(p.id)}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDuration(p.durationSeconds)} · {p.rateLimit}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-primary">{formatKes(p.priceKes)}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {chosen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4" /> M-Pesa number
              </CardTitle>
              <CardDescription>Paying for {chosen.name}. STK Push will appear on this phone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" inputMode="tel" placeholder="0712 345 678" required minLength={9} />
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button className="w-full" size="lg" type="submit" disabled={pending}>
                {pending ? "Sending STK…" : "Pay with M-Pesa"}
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
