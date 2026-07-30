"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { REGION_LABELS, Region } from "@/lib/providers/destinations";

interface DestinationResult {
  airport: string;
  cityCode: string;
  city: string;
  country: string;
  region: string;
  hook: string;
  reachable: boolean;
  totalPoints?: number;
  cpp?: number;
  cashAvoided?: number;
  routeName?: string;
  programName?: string;
  cashPriceUsd?: number;
}

const CABINS = ["economy", "premium_economy", "business", "first"] as const;
const REGIONS = Object.keys(REGION_LABELS) as Region[];

export default function ExplorePage() {
  const [form, setForm] = useState({
    origin: "",
    departureDate: "",
    cabin: "business" as (typeof CABINS)[number],
    passengers: 1,
    maxPoints: "",
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DestinationResult[] | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          departureDate: form.departureDate,
          cabin: form.cabin,
          passengers: form.passengers,
          regions: regions.length ? regions : undefined,
          maxPoints: form.maxPoints ? Number(form.maxPoints) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't search destinations.");
      else setResults(data.destinations);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const reachable = results?.filter((r) => r.reachable) ?? [];
  const outOfReach = results?.filter((r) => !r.reachable) ?? [];

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Explore
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          Where can you actually go?
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Don&rsquo;t guess a destination. We price a curated set of award
          destinations against your real balances and rank what&rsquo;s
          genuinely reachable — including what you&rsquo;d be short on the ones
          that aren&rsquo;t.
        </p>

        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={search}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="origin">From</Label>
                  <Input id="origin" placeholder="JFK" className="font-mono" required
                    maxLength={3} pattern="[A-Za-z]{3}" value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label htmlFor="date">Departure</Label>
                  <Input id="date" type="date" required value={form.departureDate}
                    onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cabin">Cabin</Label>
                  <Select id="cabin" value={form.cabin}
                    onChange={(e) => setForm({ ...form, cabin: e.target.value as typeof form.cabin })}>
                    {CABINS.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="max">Max points (optional)</Label>
                  <Input id="max" type="number" placeholder="150000" min={1000} step={5000}
                    className="font-mono" value={form.maxPoints}
                    onChange={(e) => setForm({ ...form, maxPoints: e.target.value })} />
                </div>
              </div>

              <div className="mt-4">
                <Label>Regions (all if none selected)</Label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => {
                    const on = regions.includes(r);
                    return (
                      <button key={r} type="button" aria-pressed={on}
                        onClick={() => setRegions(on ? regions.filter((x) => x !== r) : [...regions, r])}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          on ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                        }`}>
                        {REGION_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={loading} size="lg" className="mt-5 w-full">
                {loading ? "Pricing destinations…" : "Show me where I can go"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Each destination is a live award lookup, so this is limited to a
                few runs an hour — results are cached and shared for six hours.
              </p>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-display text-2xl">
                Reachable now{" "}
                <span className="font-mono text-base text-muted-foreground">
                  ({reachable.length})
                </span>
              </h2>
              {reachable.length === 0 ? (
                <p className="mt-3 text-muted-foreground">
                  Nothing in this set is fully covered by your balances yet. The
                  list below shows what each would cost.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {reachable.map((d) => (
                    <Card key={d.airport} className="border-primary/25">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-xl">{d.city}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.country} · <span className="font-mono">{d.airport}</span>
                            </p>
                          </div>
                          {d.cpp != null && d.cpp > 0 && (
                            <Badge tone="success">{d.cpp.toFixed(2)}¢/pt</Badge>
                          )}
                        </div>
                        <p className="mt-3 text-sm">{d.hook}</p>
                        <div className="mt-4 space-y-1 text-sm">
                          <p className="font-mono">
                            {d.totalPoints?.toLocaleString()} pts
                          </p>
                          <p className="text-muted-foreground">{d.routeName}</p>
                          {d.cashAvoided ? (
                            <p className="text-success">
                              ${Math.round(d.cashAvoided).toLocaleString()} cash avoided
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href="/playbook"
                            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            Build the playbook
                          </Link>
                          <Link href="/trip"
                            className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent">
                            Plan the whole trip
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {outOfReach.length > 0 && (
              <div>
                <h2 className="font-display text-2xl">
                  Not yet covered{" "}
                  <span className="font-mono text-base text-muted-foreground">
                    ({outOfReach.length})
                  </span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Either no award space showed up, or your balances can&rsquo;t
                  reach the program that has it.
                </p>
                <div className="mt-4 space-y-2">
                  {outOfReach.map((d) => (
                    <Card key={d.airport}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {d.city}{" "}
                            <span className="font-mono text-sm text-muted-foreground">
                              {d.airport}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {d.totalPoints
                              ? `Cheapest award ${d.totalPoints.toLocaleString()} pts${d.programName ? ` in ${d.programName}` : ""}`
                              : "No award space found for this date"}
                          </p>
                        </div>
                        {d.cashPriceUsd ? (
                          <span className="font-mono text-sm text-muted-foreground">
                            ${Math.round(d.cashPriceUsd).toLocaleString()} cash
                          </span>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="border-t border-border/70 pt-4 text-xs text-muted-foreground">
              Availability is cached and changes constantly. Confirm award space
              with the program before transferring points.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
