"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PlaybookStep {
  type: "transfer" | "book" | "portal";
  description: string;
  details: Record<string, unknown>;
}

interface PlaybookResult {
  best: {
    name: string;
    totalPoints: number;
    totalCash: number;
    cpp: number;
    savings: number;
    steps: PlaybookStep[];
  };
  alternatives: Array<{
    name: string;
    totalPoints: number;
    totalCash: number;
    cpp: number;
    savings: number;
  }>;
}

export default function PlaybookPage() {
  const [query, setQuery] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    cabin: "economy" as const,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaybookResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function generatePlaybook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch("/api/playbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify(query),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to generate playbook");
      } else {
        setResult(data.playbook);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Build Your Playbook</h1>
        <p className="text-muted-foreground mb-8">
          Tell us where you want to go and we'll find the best way to use your points.
        </p>

        {/* Search Form */}
        <form onSubmit={generatePlaybook} className="rounded-lg border p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input
                type="text"
                placeholder="JFK"
                value={query.origin}
                onChange={(e) => setQuery({ ...query, origin: e.target.value.toUpperCase() })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                required
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                type="text"
                placeholder="NRT"
                value={query.destination}
                onChange={(e) => setQuery({ ...query, destination: e.target.value.toUpperCase() })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                required
                maxLength={3}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Departure</label>
              <input
                type="date"
                value={query.departureDate}
                onChange={(e) => setQuery({ ...query, departureDate: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Return (optional)</label>
              <input
                type="date"
                value={query.returnDate}
                onChange={(e) => setQuery({ ...query, returnDate: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Cabin</label>
            <select
              value={query.cabin}
              onChange={(e) => setQuery({ ...query, cabin: e.target.value as any })}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
          >
            {loading ? "Building your playbook..." : "Build My Playbook"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive p-4 mb-8 text-destructive">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Best Option */}
            <div className="rounded-lg border-2 border-primary p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <h2 className="text-xl font-bold">Best Option</h2>
              </div>
              
              <div className="mb-4">
                <p className="text-lg font-semibold">{result.best.name}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-green-600 font-medium">
                    {result.best.cpp.toFixed(2)}¢ per point
                  </span>
                  <span className="text-muted-foreground">
                    ${result.best.savings.toFixed(0)} savings vs. portal
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {result.best.steps.map((step, index) => (
                  <div key={index} className="rounded-lg bg-secondary p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.description}</p>
                        {step.type === "transfer" && step.details.pointsToTransfer && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Transfer {Number(step.details.pointsToTransfer).toLocaleString()} points
                            {step.details.ratio && ` at ${step.details.ratio}:1 ratio`}
                            {step.details.timing && ` (${step.details.timing})`}
                          </p>
                        )}
                        {step.type === "book" && step.details.milesRequired && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {Number(step.details.milesRequired).toLocaleString()} miles + ${step.details.taxesAndFees} taxes
                          </p>
                        )}
                        {step.details.transferUrl && (
                          <a
                            href={String(step.details.transferUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            Open transfer page →
                          </a>
                        )}
                        {step.details.bookingUrl && (
                          <a
                            href={String(step.details.bookingUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            Open booking page →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Total: {result.best.totalPoints.toLocaleString()} points + ${result.best.totalCash} cash
                </p>
              </div>
            </div>

            {/* Alternatives */}
            {result.alternatives.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Alternative Options</h3>
                <div className="space-y-3">
                  {result.alternatives.map((alt, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{alt.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {alt.totalPoints.toLocaleString()} points + ${alt.totalCash} cash
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{alt.cpp.toFixed(2)}¢/pt</p>
                          <p className="text-sm text-muted-foreground">
                            ${alt.savings.toFixed(0)} savings
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
