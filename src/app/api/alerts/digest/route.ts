import { createClient } from "@/lib/supabase/server";
import {
  Alert,
  buildExpiryAlerts,
  buildTransferBonusAlerts,
  buildWatchAlerts,
  renderDigest,
  WatchHit,
} from "@/lib/optimization/alerts";
import { AwardOption, buildOptimizationPlaybook } from "@/lib/optimization/engine";
import { cachedFlightAwards, flightCashPrice } from "@/lib/providers/cached";
import { NextResponse } from "next/server";

/**
 * ALERTS DIGEST
 *
 * Two modes:
 *   GET  — the signed-in user's own alerts, computed live. Powers the in-app
 *          alerts panel. No email, no writes.
 *   POST — the scheduled job (Vercel Cron / GitHub Action). Requires
 *          CRON_SECRET, walks opted-in users, dedupes against alert_log, and
 *          sends email if RESEND_API_KEY is set. Without a key it runs in
 *          dry-run mode and returns what it WOULD have sent, so the whole
 *          pipeline is testable before any email provider exists.
 */

async function computeAlertsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  opts: { includeWatches: boolean }
): Promise<Alert[]> {
  const [{ data: balances }, { data: programs }, { data: rates }] =
    await Promise.all([
      supabase.from("points_balances").select("*").eq("user_id", userId),
      supabase.from("loyalty_programs").select("*"),
      supabase.from("transfer_rates").select("*"),
    ]);

  const alerts: Alert[] = [
    ...buildTransferBonusAlerts(balances ?? [], programs ?? [], rates ?? []),
    ...buildExpiryAlerts(balances ?? [], programs ?? []),
  ];

  if (!opts.includeWatches) return alerts;

  const { data: watches } = await supabase
    .from("watches")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("kind", "flight");

  const programByName = new Map((programs ?? []).map((p) => [p.name, p] as const));
  const hits: WatchHit[] = [];

  for (const watch of watches ?? []) {
    if (!watch.origin || !watch.destination) continue;
    // Check the watch window's first date; a fuller sweep is a future
    // enhancement, and one date per watch per run keeps quota predictable.
    const date =
      watch.earliest_date ??
      new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    const query = {
      origin: watch.origin,
      destination: watch.destination,
      departureDate: date,
      cabin: (watch.cabin ?? "economy") as
        | "economy"
        | "premium_economy"
        | "business"
        | "first",
      passengers: 1,
    };

    try {
      const { options } = await cachedFlightAwards(supabase, query);
      if (options.length === 0) continue;
      const cashPrice = await flightCashPrice(query);
      const awardOptions: AwardOption[] = options
        .map((o): AwardOption | null => {
          const program = programByName.get(o.programName);
          if (!program) return null;
          return {
            kind: "flight",
            program,
            milesRequired: o.milesRequired,
            taxesAndFees: o.taxesAndFeesUsd,
            cashPrice,
            label: o.airline,
            airline: o.airline,
            routing: o.routing,
            stops: o.stops,
            durationMinutes: o.durationMinutes,
            source: o.source,
          };
        })
        .filter((x): x is AwardOption => x !== null);

      const playbook = buildOptimizationPlaybook(
        balances ?? [],
        programs ?? [],
        rates ?? [],
        { type: "flight", ...query },
        awardOptions,
        { maxAlternatives: 0 }
      );
      if (!playbook) continue;

      const meetsCpp =
        watch.target_cpp != null && playbook.best.cpp >= Number(watch.target_cpp);
      const meetsPoints =
        watch.max_points != null && playbook.best.totalPoints <= watch.max_points;
      if (!meetsCpp && !meetsPoints) continue;

      hits.push({
        watchId: watch.id,
        label: `${watch.origin} → ${watch.destination}`,
        cpp: playbook.best.cpp,
        totalPoints: playbook.best.totalPoints,
        targetCpp: watch.target_cpp != null ? Number(watch.target_cpp) : null,
        maxPoints: watch.max_points,
        date,
      });
    } catch (err) {
      console.error(`watch check failed for ${watch.id}:`, err);
    }
  }

  return [...alerts, ...buildWatchAlerts(hits)];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // In-app view skips watch checks so opening the dashboard never costs quota.
  const alerts = await computeAlertsForUser(supabase, user.id, {
    includeWatches: false,
  });
  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Digest job needs SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL." },
      { status: 500 }
    );
  }

  // Service-role client: the job must read every opted-in user's data and
  // write alert_log rows, which RLS blocks for normal sessions.
  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  const admin = createServiceClient(supabaseUrl, serviceKey);

  const dryRun = !process.env.RESEND_API_KEY;
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, display_name, alerts_enabled")
    .eq("alerts_enabled", true)
    .limit(500);

  const summary: Array<{
    userId: string;
    newAlerts: number;
    sent: boolean;
    preview?: string;
  }> = [];

  for (const profile of profiles ?? []) {
    const alerts = await computeAlertsForUser(
      admin as unknown as Awaited<ReturnType<typeof createClient>>,
      profile.id as string,
      { includeWatches: true }
    );
    if (alerts.length === 0) continue;

    // Dedupe against what we've already told them.
    const { data: sentRows } = await admin
      .from("alert_log")
      .select("dedupe_key")
      .eq("user_id", profile.id);
    const alreadySent = new Set(
      (sentRows ?? []).map((r) => r.dedupe_key as string)
    );
    const fresh = alerts.filter((a) => !alreadySent.has(a.dedupeKey));
    if (fresh.length === 0) continue;

    const body = renderDigest(fresh, profile.display_name as string | null);
    let sent = false;

    if (!dryRun && profile.email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.ALERTS_FROM_EMAIL ?? "alerts@example.com",
            to: profile.email,
            subject:
              fresh.length === 1
                ? fresh[0].title
                : `${fresh.length} updates for your points`,
            text: body,
          }),
        });
        sent = res.ok;
        if (!res.ok) console.error("Resend error:", await res.text());
      } catch (err) {
        console.error("email send failed:", err);
      }
    }

    // Only record as delivered when it actually went out (or in dry-run, so
    // repeated dry runs stay quiet and mirror production behavior).
    if (sent || dryRun) {
      await admin.from("alert_log").insert(
        fresh.map((a) => ({
          user_id: profile.id as string,
          alert_type: a.type,
          dedupe_key: a.dedupeKey,
          payload: a.payload as never,
        }))
      );
    }

    summary.push({
      userId: profile.id as string,
      newAlerts: fresh.length,
      sent,
      preview: dryRun ? body.slice(0, 400) : undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    usersProcessed: profiles?.length ?? 0,
    usersWithAlerts: summary.length,
    summary,
  });
}
