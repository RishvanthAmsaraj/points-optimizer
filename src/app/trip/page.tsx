"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RouteStop } from "@/components/route-line";

interface PlaybookStep {
  type: string;
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
interface AllocatedLeg {
  id: string;
  label: string;
  funded: boolean;
  path?: PaymentPath;
  alternatives: PaymentPath[];
  reason?: string;
  cashFallbackUsd?: number;
  optional: boolean;
}
interface StayEnhancement {
  title: string;
  detail: string;
  kind: "savings" | "upgrade";
  pointsSaved?: number;
  valueUsd?: number;
  learnMoreUrl?: string;
}
interface TripPlan {
  legs: AllocatedLeg[];
  totalPointsSpent: number;
  totalCashSpent: number;
  totalCashAvoided: number;
  blendedCpp: number;
  leftovers: { programName: string; balance: number }[];
  blockers: { label: string; reason: string; cashFallbackUsd: number }[];
  narrative: string[];
  warnings: string[];
}
interface TripResponse {
  plan: TripPlan;
  stayEnhancements: Record<string, StayEnhancement[]>;
  disclaimer: string;
}

const CABINS = ["economy", "premium_economy", "business", "first"] as const;

export default function TripPage() {
  const [name, setName] = useState("My trip");
  const [include, setInclude] = useState({ flight: true, hotel: true, experience: false });
  const [flight, setFlight] = useState({
    origin: "", destination: "", departureDate: "", returnDate: "",
    cabin: "business" as (typeof CABINS)[number], passengers: 1,
  });
  const [hotel, setHotel] = useState({
    cityCode: "", cityName: "", checkIn: "", checkOut: "", rooms: 1, guests: 2,
  });
  const [experience, setExperience] = useState({ cityCode: "", budgetUsd: 400 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TripResponse | null>(null);
  const [openLeg, setOpenLeg] = useState<string | null>(null);

  async function planTrip(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          flight: include.flight
            ? { ...flight, returnDate: flight.returnDate || undefined }
            : undefined,
          hotel: include.hotel
            ? { ...hotel, cityName: hotel.cityName || undefined }
            : undefined,
          experience: include.experience
            ? { cityCode: experience.cityCode || hotel.cityCode, budgetUsd: experience.budgetUsd, optional: true }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't plan that trip.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const toggle = (key: keyof typeof include) => (
    <button
      type="button"
      onClick={() => setInclude({ ...include, [key]: !include[key] })}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        include[key]
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent"
      }`}
      aria-pressed={include[key]}
    >
      {include[key] ? "✓ " : ""}
      {key === "flight" ? "Flight" : key === "hotel" ? "Hotel" : "Experience"}
    </button>
  );

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Trip planner
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          One pool of points. The whole trip.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Flight, hotel, and experience funded from the same balances — without
          spending the same points twice. We fund the hardest leg first, size
          each transfer from what&rsquo;s actually left, and tell you what
          remains at the end.
        </p>

        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={planTrip} className="space-y-6">
              <div>
                <Label htmlFor="tripname">Trip name</Label>
                <Input
                  id="tripname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <Label>What are we booking?</Label>
                <div className="flex flex-wrap gap-2">
                  {toggle("flight")}
                  {toggle("hotel")}
                  {toggle("experience")}
                </div>
              </div>

              {include.flight && (
                <fieldset className="rounded-lg border border-border/70 p-4">
                  <legend className="px-2 font-display text-lg">Flight</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="origin">From</Label>
                      <Input id="origin" placeholder="JFK" className="font-mono" required maxLength={3} pattern="[A-Za-z]{3}"
                        value={flight.origin}
                        onChange={(e) => setFlight({ ...flight, origin: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label htmlFor="dest">To</Label>
                      <Input id="dest" placeholder="NRT" className="font-mono" required maxLength={3} pattern="[A-Za-z]{3}"
                        value={flight.destination}
                        onChange={(e) => setFlight({ ...flight, destination: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label htmlFor="dep">Departure</Label>
                      <Input id="dep" type="date" required value={flight.departureDate}
                        onChange={(e) => setFlight({ ...flight, departureDate: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="ret">Return (optional)</Label>
                      <Input id="ret" type="date" value={flight.returnDate}
                        onChange={(e) => setFlight({ ...flight, returnDate: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="cabin">Cabin</Label>
                      <Select id="cabin" value={flight.cabin}
                        onChange={(e) => setFlight({ ...flight, cabin: e.target.value as typeof flight.cabin })}>
                        {CABINS.map((c) => (
                          <option key={c} value={c}>
                            {c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pax">Passengers</Label>
                      <Input id="pax" type="number" min={1} max={9} value={flight.passengers}
                        onChange={(e) => setFlight({ ...flight, passengers: Math.max(1, Math.min(9, Number(e.target.value))) })} />
                    </div>
                  </div>
                </fieldset>
              )}

              {include.hotel && (
                <fieldset className="rounded-lg border border-border/70 p-4">
                  <legend className="px-2 font-display text-lg">Hotel</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="city">City code</Label>
                      <Input id="city" placeholder="TYO" className="font-mono" required maxLength={3} pattern="[A-Za-z]{3}"
                        value={hotel.cityCode}
                        onChange={(e) => setHotel({ ...hotel, cityCode: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label htmlFor="cityname">City name (optional)</Label>
                      <Input id="cityname" placeholder="Tokyo" value={hotel.cityName} maxLength={60}
                        onChange={(e) => setHotel({ ...hotel, cityName: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="ci">Check-in</Label>
                      <Input id="ci" type="date" required value={hotel.checkIn}
                        onChange={(e) => setHotel({ ...hotel, checkIn: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="co">Check-out</Label>
                      <Input id="co" type="date" required value={hotel.checkOut}
                        onChange={(e) => setHotel({ ...hotel, checkOut: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="rooms">Rooms</Label>
                      <Input id="rooms" type="number" min={1} max={4} value={hotel.rooms}
                        onChange={(e) => setHotel({ ...hotel, rooms: Math.max(1, Math.min(4, Number(e.target.value))) })} />
                    </div>
                    <div>
                      <Label htmlFor="guests">Guests</Label>
                      <Input id="guests" type="number" min={1} max={8} value={hotel.guests}
                        onChange={(e) => setHotel({ ...hotel, guests: Math.max(1, Math.min(8, Number(e.target.value))) })} />
                    </div>
                  </div>
                </fieldset>
              )}

              {include.experience && (
                <fieldset className="rounded-lg border border-border/70 p-4">
                  <legend className="px-2 font-display text-lg">Experience</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="expcity">City code</Label>
                      <Input id="expcity" placeholder="TYO" className="font-mono" maxLength={3} pattern="[A-Za-z]{3}"
                        value={experience.cityCode}
                        onChange={(e) => setExperience({ ...experience, cityCode: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label htmlFor="budget">Budget (USD)</Label>
                      <Input id="budget" type="number" min={50} max={10000} step={50} value={experience.budgetUsd}
                        onChange={(e) => setExperience({ ...experience, budgetUsd: Number(e.target.value) })} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Experiences are treated as optional — if the points run
                    short, we&rsquo;ll fund the flight and hotel first and tell
                    you what the experience would cost in cash.
                  </p>
                </fieldset>
              )}

              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? "Allocating your points…" : "Plan my trip"}
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
          <div className="mt-8 space-y-6">
            {/* Trip summary */}
            <div className="rounded-lg border border-primary/40 bg-card p-5 shadow-[0_0_48px_-16px_hsl(var(--primary)/0.35)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Trip plan
                </span>
                <Badge tone={result.plan.blockers.length === 0 ? "success" : "warning"}>
                  {result.plan.legs.filter((l) => l.funded).length} of{" "}
                  {result.plan.legs.length} legs on points
                </Badge>
              </div>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl">{name}</h2>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Points</p>
                  <p className="font-mono text-xl">{result.plan.totalPointsSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Cash</p>
                  <p className="font-mono text-xl">${Math.round(result.plan.totalCashSpent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Cash avoided</p>
                  <p className="font-mono text-xl text-success">${Math.round(result.plan.totalCashAvoided).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Blended</p>
                  <p className="font-mono text-xl text-success">{result.plan.blendedCpp.toFixed(2)}¢/pt</p>
                </div>
              </div>

              {/* Order of operations */}
              <div className="mt-6">
                <h3 className="mb-3 font-display text-lg">Do it in this order</h3>
                {result.plan.narrative.map((line, i) => (
                  <RouteStop key={i} index={i} isLast={i === result.plan.narrative.length - 1}>
                    <p className="text-sm leading-relaxed">{line}</p>
                  </RouteStop>
                ))}
              </div>

              {result.plan.leftovers.length > 0 && (
                <div className="ticket-perforation mt-6 pt-5">
                  <p className="text-sm text-muted-foreground">
                    Left over after the trip:{" "}
                    {result.plan.leftovers
                      .map((l) => `${l.balance.toLocaleString()} ${l.programName}`)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </div>

            {/* Blockers */}
            {result.plan.blockers.length > 0 && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-5">
                <h3 className="font-display text-lg text-amber-200">
                  What points couldn&rsquo;t cover
                </h3>
                <ul className="mt-2 space-y-2">
                  {result.plan.blockers.map((b) => (
                    <li key={b.label} className="text-sm text-amber-100">
                      <span className="font-medium">{b.label}</span> — {b.reason}{" "}
                      Plan on about ${Math.round(b.cashFallbackUsd).toLocaleString()} in cash.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-leg detail */}
            <div className="space-y-3">
              {result.plan.legs.map((leg) => (
                <Card key={leg.id}>
                  <CardContent className="p-4 sm:p-5">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setOpenLeg(openLeg === leg.id ? null : leg.id)}
                      aria-expanded={openLeg === leg.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{leg.label}</p>
                          {leg.funded && leg.path ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {leg.path.name} ·{" "}
                              <span className="font-mono">
                                {leg.path.totalPoints.toLocaleString()} pts
                              </span>
                              {leg.path.cpp > 0 && (
                                <span className="text-success">
                                  {" "}
                                  · {leg.path.cpp.toFixed(2)}¢/pt
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-amber-200">
                              {leg.optional ? "Skipped" : "Cash"} — {leg.reason}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {openLeg === leg.id ? "Hide" : "Steps"}
                        </span>
                      </div>
                    </button>

                    {openLeg === leg.id && leg.path && (
                      <div className="mt-5 border-t border-border/70 pt-5">
                        {leg.path.steps.map((step, i) => (
                          <RouteStop key={i} index={i} isLast={i === leg.path!.steps.length - 1}>
                            <div>
                              <p className="font-medium leading-snug">{step.description}</p>
                              {typeof step.details.promoNote === "string" && (
                                <p className="mt-1 text-sm text-primary">
                                  ★ {step.details.promoNote}
                                </p>
                              )}
                              {typeof step.details.transferUrl === "string" && (
                                <a href={step.details.transferUrl} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 inline-block text-sm text-primary hover:underline">
                                  Open transfer page →
                                </a>
                              )}
                              {typeof step.details.bookingUrl === "string" && (
                                <a href={step.details.bookingUrl} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 inline-block text-sm text-primary hover:underline">
                                  Open booking page →
                                </a>
                              )}
                              {typeof step.details.portalUrl === "string" && (
                                <a href={step.details.portalUrl} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 inline-block text-sm text-primary hover:underline">
                                  Open travel portal →
                                </a>
                              )}
                            </div>
                          </RouteStop>
                        ))}
                        {leg.alternatives.length > 0 && (
                          <p className="mt-3 border-t border-border/70 pt-3 text-sm text-muted-foreground">
                            Swap options:{" "}
                            {leg.alternatives
                              .map((a) => `${a.name} (${a.totalPoints.toLocaleString()} pts)`)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stay enhancements — get more than the room */}
            {Object.keys(result.stayEnhancements).length > 0 && (
              <div>
                <h3 className="font-display text-xl">Get more than the room</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Structural benefits that change what you pay or receive — free
                  nights, elite perks, and issuer programs worth comparing.
                </p>
                <div className="mt-4 space-y-3">
                  {Object.entries(result.stayEnhancements).map(([program, list]) =>
                    list.slice(0, 4).map((enh, i) => (
                      <Card key={`${program}-${i}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={enh.kind === "savings" ? "success" : "gold"}>
                              {enh.kind === "savings" ? "Saves" : "Upgrade"}
                            </Badge>
                            <p className="font-medium">{enh.title}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{enh.detail}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applies to {program}
                            {enh.pointsSaved ? ` · ~${enh.pointsSaved.toLocaleString()} points saved` : ""}
                            {enh.valueUsd ? ` · ~$${enh.valueUsd} of value` : ""}
                          </p>
                          {enh.learnMoreUrl && (
                            <a href={enh.learnMoreUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-primary hover:underline">
                              Program terms →
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {result.plan.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
                {result.plan.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-200">⚠ {w}</p>
                ))}
              </div>
            )}

            <p className="border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
              {result.disclaimer}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
