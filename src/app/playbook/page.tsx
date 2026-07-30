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
type Mode = "flight" | "hotel";

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
  floor?: { floorValueUsd: number; multiple: number };
}

interface PlaybookResult {
  best: PaymentPath;
  alternatives: PaymentPath[];
  consideredCount: number;
  meta: { provider: string; generatedAt: string; disclaimer: string };
}

interface DateOption {
  date: string;
  totalPoints: number;
  cpp: number;
  routeName: string;
  isBest: boolean;
}

interface CardRec {
  card: { id: string; name: string; issuer: string; annual_fee: number; signup_bonus_points: number };
  targetProgramName: string;
  gapPoints: number;
  coversGap: boolean;
  spendRequired: number;
  annualFee: number;
  reason: string;
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
          points
          {Number(d.taxesAndFees) > 0 &&
            ` + $${Number(d.taxesAndFees).toLocaleString()} taxes and fees`}
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
      {path.floor && path.floor.multiple >= 1.05 && (
        <span className="text-muted-foreground">
          {path.floor.multiple.toFixed(1)}× your cash-out floor
        </span>
      )}
    </div>
  );
}

export default function PlaybookPage() {
  const [mode, setMode] = useState<Mode>("flight");
  const [flight, setFlight] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    cabin: "economy" as (typeof CABINS)[number]["value"],
    passengers: 1,
  });
  const [hotel, setHotel] = useState({
    cityCode: "",
    cityName: "",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    guests: 2,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaybookResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);
  const [flexDays, setFlexDays] = useState(0);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [recs, setRecs] = useState<{ recommendations: CardRec[]; disclosure: string } | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState(false);

  async function generatePlaybook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setDateOptions([]);
    setChosenDate(null);
    setRecs(null);
    setUpgradePrompt(false);

    const body =
      mode === "flight"
        ? {
            type: "flight",
            ...flight,
            flexDays,
            returnDate: flight.returnDate || undefined,
          }
        : {
            type: "hotel",
            ...hotel,
            cityName: hotel.cityName || undefined,
          };

    try {
      const response = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Something went wrong building your playbook.");
        if (data.upgrade) setUpgradePrompt(true);
        // A 404 means award space exists somewhere but their balances can't
        // reach it — the one moment a card suggestion is genuinely useful.
        if (response.status === 404 && data.shortfall) {
          fetch("/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.shortfall),
          })
            .then((r) => r.json())
            .then((d) => d.recommendations?.length && setRecs(d))
            .catch(() => {});
        }
      } else {
        setResult(data.playbook);
        setDateOptions(data.dateOptions ?? []);
        setChosenDate(data.chosenDate ?? null);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const modeTab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setResult(null);
        setError(null);
      }}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        mode === m
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

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
          Flights and hotel stays — we map every transfer chain your points can
          reach, compare against portals and your cash-out floor, and rank the
          routes by real value.
        </p>

        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 inline-flex gap-1 rounded-lg border border-border/70 bg-background/60 p-1">
              {modeTab("flight", "✈ Flight")}
              {modeTab("hotel", "🏨 Hotel")}
            </div>

            <form onSubmit={generatePlaybook}>
              {mode === "flight" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="origin">From</Label>
                    <Input
                      id="origin"
                      placeholder="JFK"
                      value={flight.origin}
                      onChange={(e) =>
                        setFlight({
                          ...flight,
                          origin: e.target.value.toUpperCase(),
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
                    <Label htmlFor="destination">To</Label>
                    <Input
                      id="destination"
                      placeholder="NRT"
                      value={flight.destination}
                      onChange={(e) =>
                        setFlight({
                          ...flight,
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
                      value={flight.departureDate}
                      onChange={(e) =>
                        setFlight({ ...flight, departureDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="return">Return (optional)</Label>
                    <Input
                      id="return"
                      type="date"
                      value={flight.returnDate}
                      onChange={(e) =>
                        setFlight({ ...flight, returnDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="cabin">Cabin</Label>
                    <Select
                      id="cabin"
                      value={flight.cabin}
                      onChange={(e) =>
                        setFlight({
                          ...flight,
                          cabin: e.target.value as typeof flight.cabin,
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
                      value={flight.passengers}
                      onChange={(e) =>
                        setFlight({
                          ...flight,
                          passengers: Math.max(
                            1,
                            Math.min(9, Number(e.target.value))
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Date flexibility</Label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFlexDays(d)}
                          aria-pressed={flexDays === d}
                          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            flexDays === d
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {d === 0 ? "Exact date" : `±${d} day${d > 1 ? "s" : ""}`}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Award pricing swings hard day to day — shifting by a day is
                      often the biggest single saving available.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cityCode">City code</Label>
                    <Input
                      id="cityCode"
                      placeholder="TYO"
                      value={hotel.cityCode}
                      onChange={(e) =>
                        setHotel({
                          ...hotel,
                          cityCode: e.target.value.toUpperCase(),
                        })
                      }
                      required
                      maxLength={3}
                      pattern="[A-Za-z]{3}"
                      title="3-letter city code, e.g. TYO, PAR, NYC"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cityName">City name (optional)</Label>
                    <Input
                      id="cityName"
                      placeholder="Tokyo"
                      value={hotel.cityName}
                      onChange={(e) =>
                        setHotel({ ...hotel, cityName: e.target.value })
                      }
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={hotel.checkIn}
                      onChange={(e) =>
                        setHotel({ ...hotel, checkIn: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={hotel.checkOut}
                      onChange={(e) =>
                        setHotel({ ...hotel, checkOut: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rooms">Rooms</Label>
                    <Input
                      id="rooms"
                      type="number"
                      min={1}
                      max={4}
                      value={hotel.rooms}
                      onChange={(e) =>
                        setHotel({
                          ...hotel,
                          rooms: Math.max(1, Math.min(4, Number(e.target.value))),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min={1}
                      max={8}
                      value={hotel.guests}
                      onChange={(e) =>
                        setHotel({
                          ...hotel,
                          guests: Math.max(1, Math.min(8, Number(e.target.value))),
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="mt-5 w-full" size="lg">
                {loading
                  ? mode === "flight"
                    ? "Searching award space…"
                    : "Pricing award stays…"
                  : "Build my playbook"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {upgradePrompt && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm">
              Premium removes this limit and adds alerts, reverse search, and
              unlimited trip plans.{" "}
              <a href="/upgrade" className="text-primary hover:underline">
                See what&rsquo;s included →
              </a>
            </p>
          </div>
        )}

        {recs && recs.recommendations.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-xl">Ways to close the gap</h3>
            <div className="mt-3 space-y-3">
              {recs.recommendations.map((r) => (
                <Card key={r.card.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.coversGap ? "success" : "neutral"}>
                        {r.coversGap ? "Covers the gap" : "Closes most of it"}
                      </Badge>
                      <p className="font-medium">{r.card.name}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
                    <p className="mt-1 font-mono text-sm">
                      ${r.annualFee}/yr · ${r.spendRequired.toLocaleString()} spend for the bonus
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {recs.disclosure}
            </p>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-8">
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
                  {result.best.floor && (
                    <span className="block">
                      Same points as cash/credits: $
                      {Math.round(
                        result.best.floor.floorValueUsd
                      ).toLocaleString()}{" "}
                      — this route captures{" "}
                      {result.best.floor.multiple.toFixed(1)}× that
                    </span>
                  )}
                </div>
                {result.best.cpp > 0 && (
                  <div className="font-mono text-xl text-success">
                    {result.best.cpp.toFixed(2)}¢ / pt
                  </div>
                )}
              </div>
            </div>

            {dateOptions.length > 1 && (
              <div>
                <h3 className="font-display text-xl">Nearby dates</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Priced against your actual balances, not just the award chart.
                  {chosenDate && chosenDate !== flight.departureDate
                    ? ` We built the playbook for ${chosenDate} — the cheapest date we found.`
                    : ""}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {dateOptions.map((d) => (
                    <div
                      key={d.date}
                      className={`rounded-md border p-3 text-center ${
                        d.isBest
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="font-mono text-xs text-muted-foreground">
                        {d.date.slice(5)}
                      </p>
                      <p className="mt-1 font-mono text-sm">
                        {Math.round(d.totalPoints / 1000)}k
                      </p>
                      {d.cpp > 0 && (
                        <p className="font-mono text-xs text-success">
                          {d.cpp.toFixed(1)}¢
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
