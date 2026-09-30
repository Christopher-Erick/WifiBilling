"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi } from "lucide-react";

export function LoginForm() {
  const search = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const next = String(form.get("next") || "/admin");
    try {
      const res = await fetch("/api/v1/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.push(next.startsWith("/") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Wifi className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wide">LipaWiFi</span>
          </div>
          <CardTitle>Operator sign in</CardTitle>
          <CardDescription>Use a seeded account in development. Roles are enforced on the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <input type="hidden" name="next" value={search.get("next") || "/admin"} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue="admin@lipawifi.local"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue="ChangeMe_Admin1!"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
