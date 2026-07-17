"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RouteStop } from "@/components/route-line";

type StepType = "use_balance" | "transfer" | "book" | "portal";

interface PlaybookStep {
  type: StepType;
  description: string;
  details: Record<string, unknown>;
}

interface PaymentPath {
  id: string;
  name: string;
  steps: PlaybookStep[];
  totalPoints: number;
  pointsBreakdown: { programName: string; amount: number }[];
  totalCash: number;
  cpp: number;
  cashAvoided: number;
  warnings: string[];
}

interface PlaybookResult {
  best: PaymentPath;
  alternatives: PaymentPath[];
  consideredCount: number;
  meta: { provider: string; generatedAt: string; disclaimer: string };
}

const CABINS = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
] as const;

function StepBody({ step }: { step: PlaybookStep }) {
  const d = step.details;
  const link = (href: unknown, label: string) =>
    typeof href === "string" && href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-primary hover:underline"
      >
        {label} →
      </a>
    ) : null;

  return (
    <div>
      <p className="font-medium leading-snug">{step.description}</p>
      {step.type === "transfer" && (
        <p className="mt-1 text-sm text-muted-foreground">
          {d.pointsArriving != null && (
            <span className="font-mono">
              {Number(d.pointsArriving).toLocaleString()}
            </span>
          )}
          {d.pointsArriving != null && " points arrive"}
          {typeof d.blockBonus === "string" && ` · includes ${d.blockBonus}`}
          {d.timing ? ` · ${String(d.timing)}` : null}
          {d.reversible === false ? " · not reversible" : null}
        </p>
      )}
      {step.type === "book" && d.milesRequired != null && (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">
            {Number(d.milesRequired).toLocaleString()}
          </span>{" "}
          miles + ${Number(d.taxesAndFees).toLocaleString()} taxes and fees
        </p>
      )}
      {step.type === "portal" && d.note != null && (
        <p className="mt-1 text-sm text-muted-foreground">{String(d.note)}</p>
      )}
      {link(d.transferUrl, "Open transfer page")}
      {link(d.bookingUrl, "Open booking page")}
      {link(d.portalUrl, "Open travel portal")}
    </div>
  );
}

function PathMeta({ path }: { path: PaymentPath }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {path.cpp > 0 && (
        <span className="font-mono font-medium text-success">
          {path.cpp.toFixed(2)}¢ / pt
        </span>
      )}
      {path.cashAvoided > 0 && (
        <span className="text-muted-foreground">
          ${path.cashAvoided.toLocaleString()} cash avoided
        </span>
      )}
      <span className="font-mono text-muted-foreground">
        {path.totalPoints.toLocaleString()} pts
        {path.totalCash > 0 && ` + $${path.totalCash.toLocaleString()}`}
      </span>
    </div>
  );
}

export default function PlaybookPage() {
  const [query, setQuery] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    cabin: "economy" as (typeof CABINS)[number]["value"],
    passengers: 1,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaybookResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);

  async function generatePlaybook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...query,
          returnDate: query.returnDate || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Something went wrong building your playbook.");
      } else {
        setResult(data.playbook);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Playbook
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          Name the trip. We&rsquo;ll draw the route.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          We map every transfer chain your points can reach — portals included
          as the honest baseline — and rank the routes by real value.
        </p>

        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={generatePlaybook}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="origin">From</Label>
                  <Input
                    id="origin"
                    placeholder="JFK"
                    value={query.origin}
                    onChange={(e) =>
                      setQuery({ ...query, origin: e.target.value.toUpperCase() })
                    }
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    title="3-letter airport code"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="destination">To</Label>
                  <Input
                    id="destination"
                    placeholder="NRT"
                    value={query.destination}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        destination: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    title="3-letter airport code"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="departure">Departure</Label>
                  <Input
                    id="departure"
                    type="date"
                    value={query.departureDate}
                    onChange={(e) =>
                      setQuery({ ...query, departureDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="return">Return (optional)</Label>
                  <Input
                    id="return"
                    type="date"
                    value={query.returnDate}
                    onChange={(e) =>
                      setQuery({ ...query, returnDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cabin">Cabin</Label>
                  <Select
                    id="cabin"
                    value={query.cabin}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        cabin: e.target.value as typeof query.cabin,
                      })
                    }
                  >
                    {CABINS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="passengers">Passengers</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min={1}
                    max={9}
                    value={query.passengers}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        passengers: Math.max(
                          1,
                          Math.min(9, Number(e.target.value))
                        ),
                      })
                    }
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="mt-5 w-full" size="lg">
                {loading ? "Searching award space…" : "Build my playbook"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-8">
            {/* Best route — the boarding pass */}
            <div className="rounded-lg border border-primary/40 bg-card p-5 shadow-[0_0_48px_-16px_hsl(var(--primary)/0.35)] sm:p-8">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Best route to book
                </span>
                <Badge tone="gold">
                  {result.consideredCount} route
                  {result.consideredCount === 1 ? "" : "s"} considered
                </Badge>
              </div>
              <h2 className="font-display text-2xl leading-snug sm:text-3xl">
                {result.best.name}
              </h2>
              <PathMeta path={result.best} />

              {result.best.warnings.length > 0 && (
                <div className="mt-5 space-y-1 rounded-md border border-amber-400/40 bg-amber-400/10 p-4">
                  {result.best.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-200">
                      ⚠ {w}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6">
                {result.best.steps.map((step, index) => (
                  <RouteStop
                    key={index}
                    index={index}
                    isLast={index === result.best.steps.length - 1}
                  >
                    <StepBody step={step} />
                  </RouteStop>
                ))}
              </div>

              <div className="ticket-perforation mt-6 flex flex-wrap items-center justify-between gap-2 pt-5">
                <div className="text-sm text-muted-foreground">
                  {result.best.pointsBreakdown
                    .map((b) => `${b.amount.toLocaleString()} ${b.programName}`)
                    .join(" · ")}
                </div>
                {result.best.cpp > 0 && (
                  <div className="font-mono text-xl text-success">
                    {result.best.cpp.toFixed(2)}¢ / pt
                  </div>
                )}
              </div>
            </div>

            {/* Alternatives */}
            {result.alternatives.length > 0 && (
              <div>
                <h3 className="font-display text-xl">
                  Other routes we considered
                </h3>
                <div className="mt-4 space-y-3">
                  {result.alternatives.map((alt) => (
                    <Card key={alt.id}>
                      <CardContent className="p-4 sm:p-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAlt(
                              expandedAlt === alt.id ? null : alt.id
                            )
                          }
                          className="w-full text-left"
                          aria-expanded={expandedAlt === alt.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{alt.name}</p>
                              <PathMeta path={alt} />
                            </div>
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {expandedAlt === alt.id ? "Hide" : "Steps"}
                            </span>
                          </div>
                        </button>
                        {expandedAlt === alt.id && (
                          <div className="mt-5 border-t border-border/70 pt-5">
                            {alt.steps.map((step, index) => (
                              <RouteStop
                                key={index}
                                index={index}
                                isLast={index === alt.steps.length - 1}
                              >
                                <StepBody step={step} />
                              </RouteStop>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
              {result.meta.disclaimer}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
