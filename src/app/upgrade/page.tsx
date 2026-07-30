"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneGlyph } from "@/components/route-line";

const FREE = [
  "Unlimited flight playbooks",
  "Unlimited hotel playbooks",
  "Multi-hop transfer chains and split funding",
  "Cash-out floor on every route",
  "Experience catalog with value verdicts",
  "1 full trip plan per month",
  "2 active watches",
];

const PREMIUM = [
  "Everything in Free, plus:",
  "Unlimited multi-leg trip plans",
  "Unlimited watches with daily alerts",
  "Transfer-bonus alerts sized to your balances",
  "Points-expiry warnings before you lose them",
  "Flexible-date search across ±3 days",
  "Reverse search: every destination you can reach",
  "Saved plan history",
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.error ?? "Couldn't start checkout.");
    } catch {
      setMessage("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hero-glow min-h-screen px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 text-primary">
            <PlaneGlyph className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl sm:text-4xl">
            Stop leaving value on the table
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The free tier already builds real playbooks. Premium is for people
            whose balances are big enough that a missed transfer bonus or an
            expiring balance costs more than the subscription.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">Free</h2>
                <Badge tone="neutral">Current</Badge>
              </div>
              <p className="mt-2 font-mono text-3xl">$0</p>
              <ul className="mt-5 space-y-2 text-sm">
                {FREE.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/40 shadow-[0_0_48px_-16px_hsl(var(--primary)/0.35)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">Premium</h2>
                <Badge tone="gold">Recommended</Badge>
              </div>
              <p className="mt-2 font-mono text-3xl">
                $9<span className="text-lg text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {PREMIUM.map((f, i) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-primary">{i === 0 ? "★" : "✓"}</span>
                    <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Button onClick={startCheckout} disabled={loading} size="lg" className="mt-6 w-full">
                {loading ? "Opening checkout…" : "Upgrade to Premium"}
              </Button>
              {message && (
                <p className="mt-3 rounded-md border border-border bg-secondary p-3 text-sm text-muted-foreground">
                  {message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 rounded-lg border bg-card/60 p-6">
          <h3 className="font-display text-lg">What we never do</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">No card numbers, no bank logins.</span>{" "}
              You type balances; that&rsquo;s all we ever hold.
            </li>
            <li>
              <span className="text-foreground">No pay-to-rank.</span> If we ever
              earn a referral on a card, it will be disclosed on the same screen
              and it will never change the ranking.
            </li>
            <li>
              <span className="text-foreground">No cheerleading.</span> When
              paying cash beats redeeming points, we say so — that&rsquo;s the
              whole point of the cash-out floor.
            </li>
          </ul>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Cancel anytime. Prices in USD. Award pricing and program rules change
          without notice; nothing here is financial advice.
        </p>
      </div>
    </main>
  );
}
