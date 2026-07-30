import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REDEMPTION_FLOORS } from "@/lib/optimization/config";
import {
  experienceVerdict,
  toExperienceOptions,
} from "@/lib/providers/experiences";

/**
 * Experience catalog browser. Server-rendered: the catalog is public
 * reference data, and rendering on the server keeps the client bundle small.
 */
export default async function ExperiencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, { data: balances }] = await Promise.all([
    supabase
      .from("experiences")
      .select("*")
      .eq("is_active", true)
      .order("city", { ascending: true }),
    supabase
      .from("points_balances")
      .select("balance, loyalty_programs(name)")
      .eq("user_id", user.id),
  ]);

  const options = toExperienceOptions(rows ?? []);

  // Which programs the user can actually pay with, and their cash-out floor.
  const held = new Map<string, number>();
  for (const b of balances ?? []) {
    const name = (b.loyalty_programs as unknown as { name: string } | null)?.name;
    if (name) held.set(name, b.balance);
  }

  const listings = options.filter((o) => !o.isChannelRate);
  const channels = options.filter((o) => o.isChannelRate);

  const byCity = new Map<string, typeof listings>();
  for (const o of listings) {
    const key = o.city ?? "Anywhere";
    byCity.set(key, [...(byCity.get(key) ?? []), o]);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Experiences
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          What else your points can buy
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Dining access, events, tours, and money-can&rsquo;t-buy moments. We
          price each one against what your points are worth as plain cash — and
          say plainly when paying cash is the better move.
        </p>

        {/* Channels */}
        <h2 className="mt-10 font-display text-2xl">Redemption channels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Always available. The rate is what matters — most sit near 1¢, which
          is usually worse than transferring to an airline or hotel partner.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {channels.map((c) => {
            const floor = REDEMPTION_FLOORS[c.programName] ?? null;
            const verdict = experienceVerdict(c, floor);
            const balance = held.get(c.programName);
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.channel}</p>
                      <p className="text-sm text-muted-foreground">{c.programName}</p>
                    </div>
                    <Badge
                      tone={
                        verdict.tone === "good"
                          ? "success"
                          : verdict.tone === "poor"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {c.cpp.toFixed(2)}¢/pt
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{verdict.text}</p>
                  {balance ? (
                    <p className="mt-2 font-mono text-sm">
                      Your {balance.toLocaleString()} points ≈ $
                      {Math.round((balance * c.cpp) / 100).toLocaleString()} here
                    </p>
                  ) : null}
                  {c.bookingUrl && (
                    <a href={c.bookingUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-primary hover:underline">
                      Open {c.channel} →
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Listings by city */}
        <h2 className="mt-12 font-display text-2xl">Recurring inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Representative pricing for planning — the booking link is always the
          source of truth, and inventory rotates.
        </p>
        <div className="mt-4 space-y-8">
          {[...byCity.entries()].map(([city, items]) => (
            <div key={city}>
              <h3 className="font-display text-xl text-primary">{city}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((o) => {
                  const floor = REDEMPTION_FLOORS[o.programName] ?? null;
                  const verdict = experienceVerdict(o, floor);
                  const balance = held.get(o.programName) ?? 0;
                  const affordable = balance >= o.pointsRequired;
                  return (
                    <Card key={o.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">{o.name}</p>
                          <Badge
                            tone={
                              verdict.tone === "good"
                                ? "success"
                                : verdict.tone === "poor"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {o.cpp.toFixed(2)}¢/pt
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {o.channel} · {o.category}
                        </p>
                        <p className="mt-3 font-mono text-sm">
                          {o.pointsRequired.toLocaleString()} {o.programName}{" "}
                          <span className="text-muted-foreground">
                            (≈ ${o.cashPriceUsd.toLocaleString()} cash)
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {verdict.text}
                        </p>
                        {o.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{o.notes}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone={affordable ? "success" : "neutral"}>
                            {affordable
                              ? "You have enough points"
                              : balance > 0
                                ? `${(o.pointsRequired - balance).toLocaleString()} short`
                                : "No balance in this program"}
                          </Badge>
                          {o.verifiedAt && (
                            <span className="text-xs text-muted-foreground">
                              verified {o.verifiedAt}
                            </span>
                          )}
                        </div>
                        {o.bookingUrl && (
                          <a href={o.bookingUrl} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-primary hover:underline">
                            View on {o.channel} →
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {options.length === 0 && (
          <p className="mt-8 text-muted-foreground">
            No experiences loaded yet. Run{" "}
            <code className="font-mono text-sm">npx tsx scripts/seed-experiences.ts</code>{" "}
            to populate the catalog.
          </p>
        )}

        <p className="mt-10 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
          Experience inventory rotates and pricing changes without notice.
          Points Optimizer is not affiliated with any issuer or program.
        </p>
      </div>
    </main>
  );
}
