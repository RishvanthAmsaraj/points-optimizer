import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { RouteStop } from "@/components/route-line";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SavedPlan {
  legs: Array<{
    id: string;
    label: string;
    funded: boolean;
    reason?: string;
    cashFallbackUsd?: number;
    path?: {
      name: string;
      totalPoints: number;
      cpp: number;
      steps: Array<{ description: string; details: Record<string, unknown> }>;
    };
  }>;
  totalPointsSpent: number;
  totalCashSpent: number;
  totalCashAvoided: number;
  blendedCpp: number;
  leftovers: Array<{ programName: string; balance: number }>;
  narrative: string[];
  warnings: string[];
}

export default async function SavedTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!trip) notFound();
  const plan = trip.plan as unknown as SavedPlan;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href={"/history" as Route} className="text-sm text-primary hover:underline">
          ← History
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Saved trip
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{trip.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trip.destination ?? "—"} · saved{" "}
          {new Date(trip.created_at).toLocaleString()}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Points</p>
              <p className="font-mono text-xl">{trip.total_points.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Cash</p>
              <p className="font-mono text-xl">
                ${Math.round(Number(trip.total_cash_usd)).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Captured</p>
              <p className="font-mono text-xl text-success">
                ${Math.round(Number(trip.value_captured_usd)).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Blended</p>
              <p className="font-mono text-xl text-success">
                {(plan?.blendedCpp ?? 0).toFixed(2)}¢
              </p>
            </CardContent>
          </Card>
        </div>

        {plan?.narrative?.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-display text-xl">Order of operations</h2>
            {plan.narrative.map((line, i) => (
              <RouteStop key={i} index={i} isLast={i === plan.narrative.length - 1}>
                <p className="text-sm leading-relaxed">{line}</p>
              </RouteStop>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {(plan?.legs ?? []).map((leg) => (
            <Card key={leg.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{leg.label}</p>
                  <Badge tone={leg.funded ? "success" : "warning"}>
                    {leg.funded ? "On points" : "Cash"}
                  </Badge>
                </div>
                {leg.funded && leg.path ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {leg.path.name} ·{" "}
                      <span className="font-mono">
                        {leg.path.totalPoints.toLocaleString()} pts
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {leg.path.steps.map((s, i) => (
                        <li key={i}>• {s.description}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-amber-200">
                    {leg.reason}
                    {leg.cashFallbackUsd
                      ? ` Plan on about $${Math.round(leg.cashFallbackUsd).toLocaleString()}.`
                      : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {plan?.leftovers?.length > 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Left over:{" "}
            {plan.leftovers
              .map((l) => `${l.balance.toLocaleString()} ${l.programName}`)
              .join(" · ")}
          </p>
        )}

        <p className="mt-8 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
          Snapshot from when this plan was generated. Re-run it before acting —
          award space and transfer rules change without notice.
        </p>
      </div>
    </main>
  );
}
