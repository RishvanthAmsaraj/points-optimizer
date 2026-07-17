import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PointsDonut } from "@/components/points-donut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: balances }, { data: playbooks }] = await Promise.all([
    supabase
      .from("points_balances")
      .select("balance, loyalty_programs(name, point_valuation_cents)")
      .eq("user_id", user.id)
      .order("balance", { ascending: false }),
    supabase
      .from("playbooks")
      .select("id, query, best_option, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rows = (balances ?? []).map((b) => {
    const program = b.loyalty_programs as unknown as {
      name: string;
      point_valuation_cents: number | null;
    } | null;
    return {
      name: program?.name ?? "Unknown program",
      balance: b.balance,
      valueUsd: (b.balance * (program?.point_valuation_cents ?? 1)) / 100,
    };
  });

  const totalPoints = rows.reduce((s, r) => s + r.balance, 0);
  const totalValue = rows.reduce((s, r) => s + r.valueUsd, 0);
  const maxValue = Math.max(1, ...rows.map((r) => r.valueUsd));

  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Flight deck
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">
              Your points, at altitude
            </h1>
          </div>
          <Link
            href="/playbook"
            className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Build a playbook
          </Link>
        </div>

        {/* Stat row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total points
              </p>
              <p className="mt-2 font-mono text-3xl">
                {totalPoints.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Estimated value
              </p>
              <p className="mt-2 font-mono text-3xl text-success">
                {fmtUsd(totalValue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Programs held
              </p>
              <p className="mt-2 font-mono text-3xl">{rows.length}</p>
            </CardContent>
          </Card>
        </div>

        {rows.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-start gap-4 p-8">
              <h2 className="font-display text-2xl">Log your first balance</h2>
              <p className="max-w-lg text-muted-foreground">
                The dashboard lights up once we know what you hold. Add a
                points balance — it takes seconds and nothing but a number.
              </p>
              <Link
                href="/points"
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Add points balances
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Distribution donut */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">
                  Where your points sit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PointsDonut
                  slices={rows.map((r) => ({ label: r.name, value: r.balance }))}
                />
              </CardContent>
            </Card>

            {/* Value bars */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">
                  What they&rsquo;re worth
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rows.slice(0, 6).map((r) => (
                  <div key={r.name}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">
                        {r.name}
                      </span>
                      <span className="font-mono">{fmtUsd(r.valueUsd)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${(r.valueUsd / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-xs text-muted-foreground">
                  Estimated from per-point valuations — actual value depends on
                  how you redeem. Playbooks find the redemptions that beat
                  these numbers.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent playbooks */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl font-normal">
              Recent playbooks
            </CardTitle>
            <Link
              href="/playbook"
              className="text-sm text-primary hover:underline"
            >
              New playbook →
            </Link>
          </CardHeader>
          <CardContent>
            {(playbooks ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                No playbooks yet. Name a trip and we&rsquo;ll map the route
                your points can take.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {(playbooks ?? []).map((p) => {
                  const best = p.best_option as {
                    name?: string;
                    totalPoints?: number;
                    cpp?: number;
                  } | null;
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.query}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {best?.name ?? "—"}
                        </p>
                      </div>
                      <div className="text-right font-mono text-sm">
                        {best?.totalPoints != null && (
                          <p>{best.totalPoints.toLocaleString()} pts</p>
                        )}
                        {best?.cpp != null && best.cpp > 0 && (
                          <p className="text-success">
                            {best.cpp.toFixed(2)}¢/pt
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
