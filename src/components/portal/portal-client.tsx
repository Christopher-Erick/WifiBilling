"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatDuration, formatKes } from "@/lib/utils";
import { HOTSPOT_PARAM_KEYS, pickHotspotParams, type HotspotParams } from "@/lib/hotspot";
import { chapHash } from "@/lib/chap";
import { Wifi, Smartphone, ShieldCheck, Loader2 } from "lucide-react";

type Pkg = {
  id: string;
  name: string;
  description: string;
  priceKes: number;
  durationSeconds: number;
  rateLimit: string;
};

export function PortalClient({ initialPackages = [] }: { initialPackages?: Pkg[] }) {

type PayStatus = {
  paymentId: string;
  status: string;
  amountKes: number;
  phone: string;
  packageName: string;
  mock?: boolean;
  failureReason?: string | null;
  credentials: null | {
    username: string;
    password: string;
    expiresAt: string;
    status: string;
    loginUrl: string | null;
    chapId: string | null;
    chapChallenge: string | null;
    dst: string | null;
  };
};

  const search = useSearchParams();
  const hotspot = useMemo(() => {
    const raw: Record<string, string> = {};
    for (const key of HOTSPOT_PARAM_KEYS) {
      const v = search.get(key);
      if (v) raw[key] = v;
    }
    return pickHotspotParams(raw);
  }, [search]);

  const [packages, setPackages] = useState<Pkg[]>(initialPackages);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(initialPackages.length === 0);
  const [selected, setSelected] = useState<string | null>(initialPackages[0]?.id ?? null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pay, setPay] = useState<PayStatus | null>(null);

  useEffect(() => {
    if (initialPackages.length > 0) {
      setLoadingPackages(false);
      return;
    }
    fetch("/api/v1/public/packages")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.packages ?? []) as Pkg[];
        setPackages(list);
        if (list[0]) setSelected(list[0].id);
      })
      .catch(() => setLoadError("Could not load packages. Try again in a moment."))
      .finally(() => setLoadingPackages(false));
  }, [initialPackages.length]);

  useEffect(() => {
    if (!paymentId) return;
    let stop = false;
    const poll = async () => {
      const res = await fetch(`/api/v1/customer/payments/${paymentId}`);
      const data = (await res.json()) as PayStatus;
      if (!stop) setPay(data);
      if (data.status === "ACTIVATED" || data.status === "FAILED" || data.status === "CANCELLED") return;
      setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => {
      stop = true;
    };
  }, [paymentId]);

  async function payNow() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/customer/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, packageId: selected, hotspot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setPaymentId(data.paymentId);
      setPay({
        paymentId: data.paymentId,
        status: data.status,
        amountKes: data.amountKes,
        phone: data.phone,
        packageName: packages.find((p) => p.id === selected)?.name || "",
        mock: data.mock,
        credentials: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function completeDemo() {
    if (!paymentId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/internal/mpesa/mock-callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mock pay failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mock pay failed");
    } finally {
      setBusy(false);
    }
  }

  function goOnline() {
    const creds = pay?.credentials;
    if (!creds) return;
    void fetch(`/api/v1/customer/payments/${paymentId}/confirm`, { method: "POST" });
    const action = creds.loginUrl;
    if (!action) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    const password =
      creds.chapId && creds.chapChallenge ? chapHash(creds.chapId, creds.password, creds.chapChallenge) : creds.password;
    const fields: Record<string, string> = {
      username: creds.username,
      password,
      dst: creds.dst || "",
      popup: "false",
    };
    for (const [k, v] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  const waiting = pay && !["ACTIVATED", "FAILED", "CANCELLED", "ACTIVATION_FAILED"].includes(pay.status);

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

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!pay && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Choose a package</h2>
            {loadingPackages && (
              <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                Loading packages…
              </p>
            )}
            {!loadingPackages && packages.length === 0 && (
              <p className="rounded-xl border border-dashed border-accent/40 bg-card p-4 text-sm">
                No packages are on sale yet. Ask the operator to publish one in Admin → Packages.
              </p>
            )}
            <div className="grid gap-3">
              {packages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`rounded-xl border p-4 text-left shadow-sm transition ${
                    selected === p.id
                      ? "border-primary bg-white ring-2 ring-primary/40"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
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
                </button>
              ))}
            </div>
          </section>

          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4" /> M-Pesa number
                </CardTitle>
                <CardDescription>
                  Paying for {packages.find((p) => p.id === selected)?.name ?? "selected package"}. STK Push will appear
                  on this phone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" size="lg" disabled={busy || phone.length < 9} onClick={() => void payNow()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Pay with M-Pesa
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {pay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Payment
              <Badge variant={statusVariant(pay.status)}>{pay.status.replaceAll("_", " ")}</Badge>
            </CardTitle>
            <CardDescription>
              {formatKes(pay.amountKes)} · {pay.packageName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {waiting && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">Enter your M-Pesa PIN on {pay.phone}.</p>
                <p className="mt-1 text-muted-foreground">This page updates when Safaricom confirms the payment.</p>
                {pay.mock && (
                  <Button className="mt-3 w-full" variant="accent" disabled={busy} onClick={() => void completeDemo()}>
                    Complete demo payment
                  </Button>
                )}
              </div>
            )}
            {pay.status === "FAILED" || pay.status === "STK_FAILED" ? (
              <p className="text-sm text-destructive">{pay.failureReason || "Payment did not complete."}</p>
            ) : null}
            {pay.credentials && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-medium">Access is ready</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span>{pay.credentials.username}</span>
                  <span className="text-muted-foreground">Password</span>
                  <span>{pay.credentials.password}</span>
                </div>
                {pay.credentials.loginUrl ? (
                  <Button className="w-full" size="lg" onClick={goOnline}>
                    Connect me now
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    On a live HotSpot this button logs you into MikroTik. Copy the credentials if you reconnect later.
                  </p>
                )}
                <HotspotEcho hotspot={hotspot} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HotspotEcho({ hotspot }: { hotspot: HotspotParams }) {
  const keys = Object.entries(hotspot).filter(([, v]) => v);
  if (!keys.length) return null;
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">HotSpot parameters (preserved)</summary>
      <ul className="mt-2 space-y-1 font-mono">
        {keys.map(([k, v]) => (
          <li key={k}>
            {k}={v}
          </li>
        ))}
      </ul>
    </details>
  );
}
