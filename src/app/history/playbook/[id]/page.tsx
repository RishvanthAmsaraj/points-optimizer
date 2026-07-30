import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { RouteStop } from "@/components/route-line";
import { Card, CardContent } from "@/components/ui/card";

interface Step {
  type: string;
  description: string;
  details: Record<string, unknown>;
}

export default async function SavedPlaybookPage({
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

  // RLS also scopes this, but filtering by user_id makes the intent explicit.
  const { data: playbook } = await supabase
    .from("playbooks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!playbook) notFound();

  const steps = (playbook.steps ?? []) as unknown as Step[];
  const best = playbook.best_option as {
    name?: string;
    totalPoints?: number;
    totalCash?: number;
    cpp?: number;
    cashAvoided?: number;
  } | null;
  const alternatives = (playbook.alternatives ?? []) as unknown as Array<{
    name: string;
    totalPoints: number;
    cpp: number;
  }>;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href={"/history" as Route} className="text-sm text-primary hover:underline">
          ← History
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Saved playbook
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{playbook.query}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved {new Date(playbook.created_at).toLocaleString()}
        </p>

        <div className="mt-6 rounded-lg border border-primary/40 bg-card p-5 sm:p-7">
          <p className="font-display text-xl">{best?.name ?? "Route"}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {best?.cpp ? (
              <span className="font-mono text-success">{best.cpp.toFixed(2)}¢ / pt</span>
            ) : null}
            {best?.totalPoints != null && (
              <span className="font-mono text-muted-foreground">
                {best.totalPoints.toLocaleString()} pts
              </span>
            )}
            {best?.cashAvoided ? (
              <span className="text-muted-foreground">
                ${Math.round(best.cashAvoided).toLocaleString()} cash avoided
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            {steps.map((step, i) => (
              <RouteStop key={i} index={i} isLast={i === steps.length - 1}>
                <div>
                  <p className="font-medium leading-snug">{step.description}</p>
                  {typeof step.details?.bookingUrl === "string" && (
                    <a href={step.details.bookingUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-primary hover:underline">
                      Open booking page →
                    </a>
                  )}
                  {typeof step.details?.transferUrl === "string" && (
                    <a href={step.details.transferUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-primary hover:underline">
                      Open transfer page →
                    </a>
                  )}
                </div>
              </RouteStop>
            ))}
          </div>
        </div>

        {alternatives.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-5">
              <h2 className="font-display text-lg">Alternatives considered</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {alternatives.map((a, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2">
                    <span>{a.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {a.totalPoints.toLocaleString()} pts
                      {a.cpp ? ` · ${a.cpp.toFixed(2)}¢` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <p className="mt-8 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
          This is a snapshot from when it was generated. Award pricing and
          availability change constantly — re-run the playbook before acting on it.
        </p>
      </div>
    </main>
  );
}
