"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi } from "lucide-react";

export function LoginForm() {
  const search = useSearchParams();
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Wifi className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wide">LipaWiFi</span>
          </div>
          <CardTitle>Operator sign in</CardTitle>
          <CardDescription>Roles are enforced on the server. Use a seeded account in development.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={action}>
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
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
