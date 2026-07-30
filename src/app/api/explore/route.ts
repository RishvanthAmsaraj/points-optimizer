import { createClient } from "@/lib/supabase/server";
import { AwardOption, buildOptimizationPlaybook } from "@/lib/optimization/engine";
import { DESTINATIONS, Region } from "@/lib/providers/destinations";
import { cachedFlightAwards, flightCashPrice } from "@/lib/providers/cached";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * REVERSE SEARCH — "where can I actually go with what I have?"
 *
 * Instead of asking the user to guess a destination, we price a curated
 * candidate set against their real balances and rank by value. Quota control
 * is the whole design problem: every candidate is a provider call, so we
 * (a) cap candidates per request, (b) filter by region/cabin first, and
 * (c) route everything through the shared award cache.
 */
const exploreSchema = z.object({
  origin: z.string().length(3).regex(/^[A-Z]{3}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cabin: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  regions: z
    .array(
      z.enum([
        "north_america",
        "latin_america",
        "europe",
        "asia",
        "oceania",
        "middle_east",
        "africa",
      ])
    )
    .optional(),
  /** Only show destinations reachable within this many points. */
  maxPoints: z.number().int().min(1000).max(2_000_000).optional(),
  limit: z.number().int().min(4).max(16).default(10),
});

const EXPLORES_PER_HOUR = 4; // each one fans out into many provider calls

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = exploreSchema.parse(await request.json());

    const dayAhead = Math.floor(
      (new Date(`${input.departureDate}T00:00:00Z`).getTime() - Date.now()) /
        86_400_000
    );
    if (dayAhead < 0) {
      return NextResponse.json(
        { error: "Pick an upcoming date." },
        { status: 400 }
      );
    }
    if (dayAhead > 360) {
      return NextResponse.json(
        { error: "Award calendars only open about 360 days out." },
        { status: 400 }
      );
    }

    // Rate limit: reverse search is the most quota-expensive endpoint.
    const { count: recent } = await supabase
      .from("alert_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("alert_type", "explore_run")
      .gte("delivered_at", new Date(Date.now() - 3600_000).toISOString());
    if ((recent ?? 0) >= EXPLORES_PER_HOUR) {
      return NextResponse.json(
        {
          error:
            "Reverse search is limited to a few runs an hour so we don't burn through award-data quota. Try again shortly.",
        },
        { status: 429 }
      );
    }

    const [{ data: balances }, { data: programs }, { data: transferRates }] =
      await Promise.all([
        supabase.from("points_balances").select("*").eq("user_id", user.id),
        supabase.from("loyalty_programs").select("*"),
        supabase.from("transfer_rates").select("*"),
      ]);

    if (!balances || balances.length === 0) {
      return NextResponse.json(
        { error: "Add your points balances first so we know what we're spending." },
        { status: 400 }
      );
    }

    const programByName = new Map((programs ?? []).map((p) => [p.name, p] as const));
    const candidates = DESTINATIONS.filter(
      (d) =>
        d.airport !== input.origin &&
        (!input.regions?.length || input.regions.includes(d.region as Region))
    ).slice(0, input.limit);

    const results: Array<{
      airport: string;
      cityCode: string;
      city: string;
      country: string;
      region: string;
      hook: string;
      reachable: boolean;
      totalPoints?: number;
      cpp?: number;
      cashAvoided?: number;
      routeName?: string;
      programName?: string;
      cashPriceUsd?: number;
      shortfall?: { programName: string; points: number };
    }> = [];

    // Sequential on purpose: a burst of parallel provider calls is the fastest
    // way to get rate-limited by the upstream API.
    for (const dest of candidates) {
      const query = {
        origin: input.origin,
        destination: dest.airport,
        departureDate: input.departureDate,
        cabin: input.cabin,
        passengers: input.passengers,
      };

      let options;
      try {
        ({ options } = await cachedFlightAwards(supabase, query));
      } catch (err) {
        console.error(`[${requestId}] award lookup failed for ${dest.airport}:`, err);
        continue;
      }
      if (!options || options.length === 0) {
        results.push({ ...dest, reachable: false });
        continue;
      }

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
        balances,
        programs ?? [],
        transferRates ?? [],
        { type: "flight", ...query },
        awardOptions,
        { maxAlternatives: 1 }
      );

      if (!playbook) {
        // Award space exists but the user can't fund it — show the cheapest
        // award and what they'd be short, which is genuinely useful.
        const cheapest = awardOptions.sort(
          (a, b) => a.milesRequired - b.milesRequired
        )[0];
        results.push({
          ...dest,
          reachable: false,
          totalPoints: cheapest
            ? cheapest.milesRequired * input.passengers
            : undefined,
          programName: cheapest?.program.name,
          cashPriceUsd: cashPrice * input.passengers,
        });
        continue;
      }

      results.push({
        ...dest,
        reachable: true,
        totalPoints: playbook.best.totalPoints,
        cpp: playbook.best.cpp,
        cashAvoided: playbook.best.cashAvoided,
        routeName: playbook.best.name,
        cashPriceUsd: cashPrice * input.passengers,
      });
    }

    const filtered = input.maxPoints
      ? results.filter(
          (r) => !r.reachable || (r.totalPoints ?? 0) <= input.maxPoints!
        )
      : results;

    // Reachable first, then best value per point.
    filtered.sort((a, b) => {
      if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
      return (b.cpp ?? 0) - (a.cpp ?? 0);
    });

    // Log the run for rate limiting (best-effort; a failure never blocks).
    await supabase.from("alert_log").insert({
      user_id: user.id,
      alert_type: "explore_run",
      dedupe_key: `explore:${Date.now()}`,
      payload: { origin: input.origin, count: filtered.length } as never,
    });

    console.log(
      `[${requestId}] explore from ${input.origin}: ${filtered.filter((r) => r.reachable).length}/${filtered.length} reachable in ${Date.now() - startedAt}ms`
    );

    return NextResponse.json({
      origin: input.origin,
      departureDate: input.departureDate,
      cabin: input.cabin,
      destinations: filtered,
      disclaimer:
        "Availability is cached and changes constantly. Confirm award space with the program before transferring points.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error(`[${requestId}] explore error:`, error);
    return NextResponse.json({ error: "Failed to search destinations" }, { status: 500 });
  }
}
