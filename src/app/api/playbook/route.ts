import { createClient } from "@/lib/supabase/server";
import {
  AwardOption,
  buildOptimizationPlaybook,
} from "@/lib/optimization/engine";
import {
  getAwardProvider,
  getCashPriceProvider,
  ProviderAwardOption,
} from "@/lib/providers";
import { NextResponse } from "next/server";
import { z } from "zod";

const IATA = /^[A-Z]{3}$/;

const playbookSchema = z.object({
  origin: z.string().length(3).regex(IATA, "Use a 3-letter airport code"),
  destination: z.string().length(3).regex(IATA, "Use a 3-letter airport code"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cabin: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
});

/** Free accounts get a small monthly preview; premium is unlimited. */
const FREE_PLAYBOOKS_PER_MONTH = Number(process.env.PLAYBOOK_FREE_LIMIT ?? 2);
const AWARD_CACHE_HOURS = 6;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Tier gating -------------------------------------------------------
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.subscription_tier === "premium";
    if (!isPremium) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("playbooks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());

      if ((count ?? 0) >= FREE_PLAYBOOKS_PER_MONTH) {
        return NextResponse.json(
          {
            error: `You've used your ${FREE_PLAYBOOKS_PER_MONTH} free playbooks this month. Upgrade for unlimited playbooks.`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validated = playbookSchema.parse(body);

    // --- Award availability (cached) ---------------------------------------
    const awardProvider = getAwardProvider();
    let providerOptions: ProviderAwardOption[] | null = null;

    const { data: cached } = await supabase
      .from("award_cache")
      .select("results")
      .eq("origin", validated.origin)
      .eq("destination", validated.destination)
      .eq("departure_date", validated.departureDate)
      .eq("cabin", validated.cabin)
      .gt("expires_at", new Date().toISOString())
      .order("cached_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.results && Array.isArray(cached.results)) {
      providerOptions = cached.results as unknown as ProviderAwardOption[];
    } else {
      providerOptions = await awardProvider.searchAwards(validated);
      const expiresAt = new Date(
        Date.now() + AWARD_CACHE_HOURS * 3600 * 1000
      ).toISOString();
      await supabase.from("award_cache").insert({
        origin: validated.origin,
        destination: validated.destination,
        departure_date: validated.departureDate,
        cabin: validated.cabin,
        results: providerOptions as unknown as never,
        provider: awardProvider.name,
        expires_at: expiresAt,
      });
    }

    if (!providerOptions || providerOptions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No award availability found for this route and date. Try nearby dates or airports.",
        },
        { status: 404 }
      );
    }

    // --- Cash price baseline (best effort) ---------------------------------
    const cashQuote = await getCashPriceProvider().getCashPrice(validated);
    const cashPrice = cashQuote?.priceUsd ?? 0;

    // --- Resolve provider results to program rows --------------------------
    const [{ data: balances }, { data: programs }, { data: transferRates }] =
      await Promise.all([
        supabase.from("points_balances").select("*").eq("user_id", user.id),
        supabase.from("loyalty_programs").select("*"),
        supabase.from("transfer_rates").select("*"),
      ]);

    const programByName = new Map(
      (programs ?? []).map((p) => [p.name, p] as const)
    );
    const awardOptions: AwardOption[] = [];
    for (const opt of providerOptions) {
      const program = programByName.get(opt.programName);
      if (!program) {
        console.warn(`Unknown program from provider: ${opt.programName}`);
        continue;
      }
      awardOptions.push({
        program,
        milesRequired: opt.milesRequired,
        taxesAndFees: opt.taxesAndFeesUsd,
        cashPrice,
        airline: opt.airline,
        routing: opt.routing,
        stops: opt.stops,
        durationMinutes: opt.durationMinutes,
        source: opt.source,
      });
    }

    // --- Optimize -----------------------------------------------------------
    const playbook = buildOptimizationPlaybook(
      balances ?? [],
      programs ?? [],
      transferRates ?? [],
      validated,
      awardOptions,
      { providerName: awardProvider.name }
    );

    if (!playbook) {
      return NextResponse.json(
        {
          error:
            "We found award space, but none of it is reachable with your current balances. Add your points balances, or check the cards page for transfer options.",
        },
        { status: 404 }
      );
    }

    // --- Persist (best effort — response shape never depends on the save) ---
    const { data: saved, error: saveError } = await supabase
      .from("playbooks")
      .insert({
        user_id: user.id,
        query: `${validated.origin} → ${validated.destination} (${validated.cabin}, ${validated.passengers} pax)`,
        steps: playbook.best.steps as unknown as never,
        best_option: {
          name: playbook.best.name,
          totalPoints: playbook.best.totalPoints,
          totalCash: playbook.best.totalCash,
          cpp: playbook.best.cpp,
          cashAvoided: playbook.best.cashAvoided,
        } as unknown as never,
        alternatives: playbook.alternatives.map((alt) => ({
          name: alt.name,
          totalPoints: alt.totalPoints,
          totalCash: alt.totalCash,
          cpp: alt.cpp,
          cashAvoided: alt.cashAvoided,
        })) as unknown as never,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Error saving playbook:", saveError);
    }

    return NextResponse.json({
      playbookId: saved?.id ?? null,
      playbook, // always the full computed result: { best, alternatives, meta, ... }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Playbook generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate playbook" },
      { status: 500 }
    );
  }
}
