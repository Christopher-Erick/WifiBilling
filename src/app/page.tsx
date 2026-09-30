import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <Wifi className="h-5 w-5 text-primary" />
          LipaWiFi
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/portal">Customer portal</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/login">Operator login</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-16 pt-8">
        <section className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Open source · Kenya</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            Wi-Fi billing that waits for M-Pesa before anyone gets online.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            LipaWiFi is for Kenyan operators. Customers pick a package and pay with an M-Pesa PIN prompt. Money lands
            on your Safaricom Paybill (settled to the linked Equity account). Manual Paybill is shown as a fallback.
            Expiry takes access away.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/portal">Try the customer portal</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/admin/login">Open the dashboard</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Demo admin: <span className="font-mono">admin@lipawifi.local</span> /{" "}
            <span className="font-mono">ChangeMe_Admin1!</span> · M-Pesa is mocked so you never spend real money.
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "STK first", body: "Pay with M-Pesa sends a PIN prompt. Paybill number, account, and amount stay on screen if they need to pay by hand. Typing the account is not payment." },
            { title: "Many Wi-Fi sites", body: "Every payment belongs to a site you register. Secrets stay per router." },
            { title: "Reconciliation", body: "See paid-but-not-online queues and retry from the operator dashboard." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
