"use client";

import { useState } from "react";

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

function StepCard({ step, index }: { step: PlaybookStep; index: number }) {
  const d = step.details;
  return (
    <div className="rounded-lg bg-secondary p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{step.description}</p>

          {step.type === "transfer" && (
            <p className="text-sm text-muted-foreground mt-1">
              {d.pointsArriving != null &&
                `${Number(d.pointsArriving).toLocaleString()} points arrive`}
              {d.blockBonus ? ` (includes ${d.blockBonus})` : null}
              {d.timing ? ` · ${String(d.timing)}` : null}
              {d.reversible === false ? " · not reversible" : null}
            </p>
          )}

          {step.type === "book" && d.milesRequired != null && (
            <p className="text-sm text-muted-foreground mt-1">
              {Number(d.milesRequired).toLocaleString()} miles + $
              {Number(d.taxesAndFees).toLocaleString()} taxes and fees
            </p>
          )}

          {step.type === "portal" && d.note != null && (
            <p className="text-sm text-muted-foreground mt-1">{String(d.note)}</p>
          )}

          {typeof d.transferUrl === "string" && d.transferUrl && (
            <a
              href={d.transferUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Open transfer page →
            </a>
          )}
          {typeof d.bookingUrl === "string" && d.bookingUrl && (
            <a
              href={d.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Open booking page →
            </a>
          )}
          {typeof d.portalUrl === "string" && d.portalUrl && (
            <a
              href={d.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Open travel portal →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PathSummary({ path }: { path: PaymentPath }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
      {path.cpp > 0 && (
        <span className="text-green-600 font-medium">
          {path.cpp.toFixed(2)}¢ per point
        </span>
      )}
      {path.cashAvoided > 0 && (
        <span className="text-muted-foreground">
          ${path.cashAvoided.toLocaleString()} cash avoided
        </span>
      )}
      <span className="text-muted-foreground">
        {path.totalPoints.toLocaleString()} points
        {path.totalCash > 0 && ` + $${path.totalCash.toLocaleString()} fees`}
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

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2";

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Build your playbook</h1>
        <p className="text-muted-foreground mb-8">
          Tell us the trip. We'll map every transfer chain your points can
          reach and rank the routes by value.
        </p>

        <form
          onSubmit={generatePlaybook}
          className="rounded-lg border p-4 sm:p-6 mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium mb-1">
                From
              </label>
              <input
                id="origin"
                type="text"
                placeholder="JFK"
                value={query.origin}
                onChange={(e) =>
                  setQuery({ ...query, origin: e.target.value.toUpperCase() })
                }
                className={inputClass}
                required
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="3-letter airport code"
              />
            </div>
            <div>
              <label
                htmlFor="destination"
                className="block text-sm font-medium mb-1"
              >
                To
              </label>
              <input
                id="destination"
                type="text"
                placeholder="NRT"
                value={query.destination}
                onChange={(e) =>
                  setQuery({
                    ...query,
                    destination: e.target.value.toUpperCase(),
                  })
                }
                className={inputClass}
                required
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="3-letter airport code"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="departure"
                className="block text-sm font-medium mb-1"
              >
                Departure
              </label>
              <input
                id="departure"
                type="date"
                value={query.departureDate}
                onChange={(e) =>
                  setQuery({ ...query, departureDate: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="return" className="block text-sm font-medium mb-1">
                Return (optional)
              </label>
              <input
                id="return"
                type="date"
                value={query.returnDate}
                onChange={(e) =>
                  setQuery({ ...query, returnDate: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="cabin" className="block text-sm font-medium mb-1">
                Cabin
              </label>
              <select
                id="cabin"
                value={query.cabin}
                onChange={(e) =>
                  setQuery({
                    ...query,
                    cabin: e.target.value as typeof query.cabin,
                  })
                }
                className={inputClass}
              >
                {CABINS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="passengers"
                className="block text-sm font-medium mb-1"
              >
                Passengers
              </label>
              <input
                id="passengers"
                type="number"
                min={1}
                max={9}
                value={query.passengers}
                onChange={(e) =>
                  setQuery({
                    ...query,
                    passengers: Math.max(1, Math.min(9, Number(e.target.value))),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
          >
            {loading ? "Searching award space…" : "Build my playbook"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-destructive p-4 mb-8 text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-primary p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🏆</span>
                <h2 className="text-xl font-bold">Best route to book</h2>
              </div>
              <p className="text-lg font-semibold">{result.best.name}</p>
              <PathSummary path={result.best} />

              {result.best.warnings.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3">
                  {result.best.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-800">
                      ⚠ {w}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-3 mt-4">
                {result.best.steps.map((step, index) => (
                  <StepCard key={index} step={step} index={index} />
                ))}
              </div>

              {result.best.pointsBreakdown.length > 1 && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  Points used:{" "}
                  {result.best.pointsBreakdown
                    .map(
                      (b) => `${b.amount.toLocaleString()} ${b.programName}`
                    )
                    .join(" · ")}
                </div>
              )}
            </div>

            {result.alternatives.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Other routes we considered
                </h3>
                <div className="space-y-3">
                  {result.alternatives.map((alt) => (
                    <div key={alt.id} className="rounded-lg border p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAlt(expandedAlt === alt.id ? null : alt.id)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{alt.name}</p>
                            <PathSummary path={alt} />
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {expandedAlt === alt.id ? "Hide steps" : "Show steps"}
                          </span>
                        </div>
                      </button>
                      {expandedAlt === alt.id && (
                        <div className="space-y-3 mt-4">
                          {alt.steps.map((step, index) => (
                            <StepCard key={index} step={step} index={index} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t pt-4">
              {result.meta.disclaimer}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
