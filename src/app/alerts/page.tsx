"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Alert {
  type: string;
  title: string;
  body: string;
  urgency: "high" | "normal";
}
interface Watch {
  id: string;
  kind: string;
  origin: string | null;
  destination: string | null;
  city_code: string | null;
  cabin: string | null;
  target_cpp: number | null;
  max_points: number | null;
}

export default function AlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    cabin: "business",
    targetCpp: "",
    maxPoints: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [alertsRes, watchesRes] = await Promise.all([
      fetch("/api/alerts/digest").then((r) => r.json()).catch(() => ({ alerts: [] })),
      fetch("/api/watches").then((r) => r.json()).catch(() => ({ watches: [] })),
    ]);
    setAlerts(alertsRes.alerts ?? []);
    setWatches(watchesRes.watches ?? []);

    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("alerts_enabled")
        .eq("id", user.user.id)
        .single();
      if (profile) setAlertsEnabled(profile.alerts_enabled);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAlerts() {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase
        .from("profiles")
        .update({ alerts_enabled: next })
        .eq("id", user.user.id);
    }
  }

  async function addWatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "flight",
        origin: form.origin,
        destination: form.destination,
        cabin: form.cabin,
        targetCpp: form.targetCpp ? Number(form.targetCpp) : undefined,
        maxPoints: form.maxPoints ? Number(form.maxPoints) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't save that watch.");
      return;
    }
    setForm({ origin: "", destination: "", cabin: "business", targetCpp: "", maxPoints: "" });
    load();
  }

  async function removeWatch(id: string) {
    await fetch(`/api/watches?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Alerts
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          We watch, you book
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Transfer bonuses sized to your actual balances, expiry warnings before
          you lose points, and saved routes that ping you when they hit your
          number.
        </p>

        <Card className="mt-8">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">Email digests</p>
              <p className="text-sm text-muted-foreground">
                One email when something actually changes. Never a daily
                nothing-burger.
              </p>
            </div>
            <Button variant={alertsEnabled ? "primary" : "outline"} onClick={toggleAlerts}>
              {alertsEnabled ? "On" : "Off"}
            </Button>
          </CardContent>
        </Card>

        <h2 className="mt-10 font-display text-2xl">Right now</h2>
        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-secondary" />
        ) : alerts.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Nothing needs your attention. That&rsquo;s the goal — we&rsquo;ll
            tell you the moment it changes.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {alerts.map((a, i) => (
              <Card key={i} className={a.urgency === "high" ? "border-primary/40" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.urgency === "high" ? "warning" : "neutral"}>
                      {a.type === "transfer_bonus"
                        ? "Bonus"
                        : a.type === "expiry"
                          ? "Expiring"
                          : "Watch"}
                    </Badge>
                    <p className="font-medium">{a.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h2 className="mt-12 font-display text-2xl">Watched routes</h2>
        <Card className="mt-4">
          <CardContent className="p-5">
            <form onSubmit={addWatch} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wo">From</Label>
                <Input id="wo" placeholder="JFK" className="font-mono" required maxLength={3}
                  pattern="[A-Za-z]{3}" value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label htmlFor="wd">To</Label>
                <Input id="wd" placeholder="NRT" className="font-mono" required maxLength={3}
                  pattern="[A-Za-z]{3}" value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label htmlFor="wc">Cabin</Label>
                <Select id="wc" value={form.cabin}
                  onChange={(e) => setForm({ ...form, cabin: e.target.value })}>
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wt">Target ¢/pt</Label>
                  <Input id="wt" type="number" step="0.1" min="0.1" placeholder="2.0"
                    className="font-mono" value={form.targetCpp}
                    onChange={(e) => setForm({ ...form, targetCpp: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="wm">Max points</Label>
                  <Input id="wm" type="number" step="5000" min="1000" placeholder="90000"
                    className="font-mono" value={form.maxPoints}
                    onChange={(e) => setForm({ ...form, maxPoints: e.target.value })} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Watch this route</Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Set at least one target so we know what &ldquo;good&rdquo; means to you.
                </p>
              </div>
            </form>
            {error && (
              <p className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {watches.length > 0 && (
          <div className="mt-4 space-y-2">
            {watches.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-mono font-medium">
                      {w.origin} → {w.destination}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {w.cabin?.replace("_", " ")}
                      {w.target_cpp ? ` · target ${Number(w.target_cpp).toFixed(2)}¢/pt` : ""}
                      {w.max_points ? ` · under ${w.max_points.toLocaleString()} pts` : ""}
                    </p>
                  </div>
                  <button onClick={() => removeWatch(w.id)}
                    className="text-sm text-destructive hover:text-destructive/80">
                    Remove
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
