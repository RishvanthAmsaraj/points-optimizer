import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PointsDonut } from "@/components/points-donut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REDEMPTION_FLOORS } from "@/lib/optimization/config";
import { assessExpiryRisk, resetAdvice } from "@/lib/optimization/expiry";
import { effectiveMultiplier } from "@/lib/optimization/engine";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: balances },
    { data: playbooks },
    { data: trips },
    { data: promoRates },
  ] = await Promise.all([
    supabase
      .from("points_balances")
      .select(
        "balance, last_activity_at, loyalty_programs(name, point_valuation_cents, expiration_policy)"
      )
      .eq("user_id", user.id)
      .order("balance", { ascending: false }),
    supabase
      .from("playbooks")
      .select("id, query, best_option, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("trips")
      .select("id, name, destination, total_points, value_captured_usd, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("transfer_rates")
      .select(
        "bonus_multiplier, promo_name, promo_starts_at, promo_ends_at, from_program:loyalty_programs!transfer_rates_from_program_id_fkey(name), to_program:loyalty_programs!transfer_rates_to_program_id_fkey(name)"
      )
      .gt("bonus_multiplier", 1)
      .not("promo_ends_at", "is", null)
      .gte("promo_ends_at", new Date().toISOString().slice(0, 10)),
  ]);

  const rows = (balances ?? []).map((b) => {
    const program = b.loyalty_programs as unknown as {
      name: string;
      point_valuation_cents: number | null;
      expiration_policy: string | null;
    } | null;
    return {
      name: program?.name ?? "Unknown program",
      balance: b.balance,
      valueUsd: (b.balance * (program?.point_valuation_cents ?? 1)) / 100,
      lastActivityAt: b.last_activity_at,
      expirationPolicy: program?.expiration_policy ?? null,
    };
  });

  // Points at risk — only for balances with a known last-activity date.
  const risks = assessExpiryRisk(
    rows.map((r) => ({
      programName: r.name,
      balance: r.balance,
      lastActivityAt: r.lastActivityAt,
      expirationPolicy: r.expirationPolicy,
    }))
  );
  const untracked = rows.filter((r) => r.balance > 0 && !r.lastActivityAt).length;

  // Live transfer bonuses, filtered through the same window logic the engine uses.
  const activePromos = (promoRates ?? [])
    .filter((p) =>
      effectiveMultiplier({
        bonus_multiplier: p.bonus_multiplier,
        promo_starts_at: p.promo_starts_at,
        promo_ends_at: p.promo_ends_at,
      } as never) > 1
    )
    .map((p) => ({
      from: (p.from_program as unknown as { name: string } | null)?.name ?? "?",
      to: (p.to_program as unknown as { name: string } | null)?.name ?? "?",
      pct: Math.round((Number(p.bonus_multiplier) - 1) * 100),
      endsOn: p.promo_ends_at as string,
      note: p.promo_name as string | null,
    }));

  const totalPoints = rows.reduce((s, r) => s + r.balance, 0);
  const totalValue = rows.reduce((s, r) => s + r.valueUsd, 0);
  // Cash-out floor: what the bank-currency portion is worth as plain cash or
  // statement credits — the number a redemption must beat to be worth doing.
  const floorValue = rows.reduce((s, r) => {
    const cpp = REDEMPTION_FLOORS[r.name];
    return cpp ? s + (r.balance * cpp) / 100 : s;
  }, 0);
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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/trip"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Plan a trip
            </Link>
            <Link
              href="/playbook"
              className="inline-flex h-11 items-center rounded-md border border-input px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Single playbook
            </Link>
          </div>
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
              {floorValue > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cash-out floor: {fmtUsd(floorValue)} — playbooks find what
                  beats it
                </p>
              )}
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

        {/* Points at risk */}
        {(risks.length > 0 || untracked > 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-display text-xl font-normal">
                Points at risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {risks.map((risk) => (
                <div
                  key={risk.programName}
                  className={`rounded-md border p-4 ${
                    risk.severity === "critical"
                      ? "border-destructive/50 bg-destructive/10"
                      : risk.severity === "warning"
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-border bg-secondary"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {risk.balance.toLocaleString()} {risk.programName}
                    </p>
                    <Badge
                      tone={
                        risk.severity === "critical"
                          ? "warning"
                          : risk.severity === "warning"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {risk.daysRemaining <= 0
                        ? "may already have expired"
                        : `${risk.daysRemaining} days left`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Policy: {risk.policy} — on your reported activity that lands
                    around {risk.expiresOn}. {resetAdvice(risk.programName)}
                  </p>
                </div>
              ))}
              {untracked > 0 && (
                <p className="text-sm text-muted-foreground">
                  {untracked} balance{untracked === 1 ? "" : "s"} have no last-activity
                  date, so we can&rsquo;t check expiry.{" "}
                  <Link href="/points" className="text-primary hover:underline">
                    Add dates on the Points page
                  </Link>{" "}
                  and we&rsquo;ll watch them for you.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live transfer bonuses */}
        {activePromos.length > 0 && (
          <Card className="mt-6 border-primary/30">
            <CardHeader>
              <CardTitle className="font-display text-xl font-normal">
                Transfer bonuses live right now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activePromos.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="text-primary">+{p.pct}%</span> {p.from} →{" "}
                    {p.to}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                  <span className="font-mono text-xs text-muted-foreground">
                    through {p.endsOn}
                  </span>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Playbooks already price these in automatically while they last.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trips */}
        {(trips ?? []).length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl font-normal">
                Your trips
              </CardTitle>
              <Link href="/trip" className="text-sm text-primary hover:underline">
                Plan a trip →
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/70">
                {(trips ?? []).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.destination ?? "—"}
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm">
                      <p>{t.total_points.toLocaleString()} pts</p>
                      <p className="text-success">
                        {fmtUsd(Number(t.value_captured_usd))} captured
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
