import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: trips }, { data: playbooks }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, name, destination, start_date, total_points, value_captured_usd, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("playbooks")
      .select("id, query, type, best_option, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString();

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          History
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          Everything you&rsquo;ve planned
        </h1>

        <h2 className="mt-10 font-display text-2xl">Trips</h2>
        {(trips ?? []).length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            No trips yet.{" "}
            <Link href={"/trip" as Route} className="text-primary hover:underline">
              Plan one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {(trips ?? []).map((t) => (
              <Link key={t.id} href={`/history/trip/${t.id}` as Route} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.destination ?? "—"}
                        {t.start_date ? ` · ${t.start_date}` : ""} ·{" "}
                        {fmtDate(t.created_at)}
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm">
                      <p>{t.total_points.toLocaleString()} pts</p>
                      <p className="text-success">
                        ${Math.round(Number(t.value_captured_usd)).toLocaleString()} captured
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <h2 className="mt-12 font-display text-2xl">Playbooks</h2>
        {(playbooks ?? []).length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            No playbooks yet.{" "}
            <Link href={"/playbook" as Route} className="text-primary hover:underline">
              Build one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {(playbooks ?? []).map((p) => {
              const best = p.best_option as {
                name?: string;
                totalPoints?: number;
                cpp?: number;
              } | null;
              return (
                <Link key={p.id} href={`/history/playbook/${p.id}` as Route} className="block">
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral">{p.type === "hotel" ? "Hotel" : "Flight"}</Badge>
                          <p className="truncate font-medium">{p.query}</p>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {best?.name ?? "—"} · {fmtDate(p.created_at)}
                        </p>
                      </div>
                      <div className="text-right font-mono text-sm">
                        {best?.totalPoints != null && (
                          <p>{best.totalPoints.toLocaleString()} pts</p>
                        )}
                        {best?.cpp != null && best.cpp > 0 && (
                          <p className="text-success">{best.cpp.toFixed(2)}¢/pt</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
