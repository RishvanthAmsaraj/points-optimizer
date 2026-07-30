import { createClient } from "@/lib/supabase/server";
import {
  AwardOption,
  buildOptimizationPlaybook,
  TravelQuery,
} from "@/lib/optimization/engine";
import {
  getAwardProvider,
  getCashPriceProvider,
  getHotelAwardProvider,
  getHotelCashProvider,
  ProviderAwardOption,
  ProviderHotelOption,
} from "@/lib/providers";
import { cachedFlightAwards } from "@/lib/providers/cached";
import { NextResponse } from "next/server";
import { z } from "zod";

const IATA = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const flightSchema = z.object({
  type: z.literal("flight").default("flight"),
  origin: z.string().length(3).regex(IATA, "Use a 3-letter airport code"),
  destination: z.string().length(3).regex(IATA, "Use a 3-letter airport code"),
  departureDate: z.string().regex(DATE),
  returnDate: z.string().regex(DATE).optional(),
  cabin: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  /** Search +/- this many days around the departure date. */
  flexDays: z.number().int().min(0).max(3).default(0),
});

const hotelSchema = z.object({
  type: z.literal("hotel"),
  cityCode: z.string().length(3).regex(IATA, "Use a 3-letter city code"),
  cityName: z.string().max(60).optional(),
  checkIn: z.string().regex(DATE),
  checkOut: z.string().regex(DATE),
  rooms: z.number().int().min(1).max(4).default(1),
  guests: z.number().int().min(1).max(8).default(2),
});

const playbookSchema = z.union([hotelSchema, flightSchema]);

const FREE_PLAYBOOKS_PER_MONTH = Number(process.env.PLAYBOOK_FREE_LIMIT ?? 2);
const PLAYBOOKS_PER_HOUR = 10; // applies to everyone; protects provider quota
const CACHE_HOURS = 6;
const BOOKING_HORIZON_DAYS = 360;
const MAX_NIGHTS = 30;

function daysFromToday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.floor((d - Date.now()) / 86_400_000);
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = playbookSchema.parse(body);

    // --- Date sanity (works for both branches) ---------------------------
    const startDate =
      validated.type === "flight" ? validated.departureDate : validated.checkIn;
    const startOffset = daysFromToday(startDate);
    if (startOffset < 0) {
      return NextResponse.json(
        { error: "That date is in the past — pick an upcoming date." },
        { status: 400 }
      );
    }
    if (startOffset > BOOKING_HORIZON_DAYS) {
      return NextResponse.json(
        {
          error: `Award calendars only open ~${BOOKING_HORIZON_DAYS} days out — pick a closer date.`,
        },
        { status: 400 }
      );
    }

    // --- Rate limits ------------------------------------------------------
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: hourCount } = await supabase
      .from("playbooks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", hourAgo);
    if ((hourCount ?? 0) >= PLAYBOOKS_PER_HOUR) {
      return NextResponse.json(
        { error: "You're moving fast — try again in a little while." },
        { status: 429 }
      );
    }

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

    // --- Branch: gather award options + cash baseline --------------------
    let awardInputs: Array<{
      programName: string;
      pointsRequired: number;
      taxesAndFeesUsd: number;
      label: string;
      kind: "flight" | "hotel";
      flight?: ProviderAwardOption;
    }> = [];
    let cashPrice = 0;
    let providerName = "";
    let engineQuery: TravelQuery;
    let queryText = "";
    /** Flexible-date comparison: best result per candidate date. */
    let chosenDateForResponse: string | undefined;
    let dateOptions: Array<{
      date: string;
      totalPoints: number;
      cpp: number;
      routeName: string;
      isBest: boolean;
    }> = [];

    if (validated.type === "flight") {
      engineQuery = validated;
      queryText = `${validated.origin} → ${validated.destination} (${validated.cabin}, ${validated.passengers} pax)`;
      const provider = getAwardProvider();
      providerName = provider.name;

      let options: ProviderAwardOption[] | null = null;
      let chosenDate = validated.departureDate;

      try {
        ({ options } = await cachedFlightAwards(supabase, validated));
      } catch (err) {
        console.error(`[${requestId}] award provider failed:`, err);
        return NextResponse.json(
          {
            error:
              "Our award-data source isn't responding right now. Try again in a few minutes.",
          },
          { status: 503 }
        );
      }

      // --- Flexible dates -------------------------------------------------
      // Award pricing swings enormously day to day, so shifting by a day or
      // two is often the single biggest saving available. We price each
      // candidate date against the user's actual balances (not just the raw
      // award chart) because the cheapest award is useless if they can't
      // reach that program.
      if (validated.flexDays > 0) {
        const [{ data: flexBalances }, { data: flexPrograms }, { data: flexRates }] =
          await Promise.all([
            supabase.from("points_balances").select("*").eq("user_id", user.id),
            supabase.from("loyalty_programs").select("*"),
            supabase.from("transfer_rates").select("*"),
          ]);
        const flexProgramByName = new Map(
          (flexPrograms ?? []).map((p) => [p.name, p] as const)
        );
        const base = new Date(`${validated.departureDate}T00:00:00Z`);
        const candidates: string[] = [];
        for (let offset = -validated.flexDays; offset <= validated.flexDays; offset++) {
          const d = new Date(base.getTime() + offset * 86_400_000);
          const iso = d.toISOString().slice(0, 10);
          if (new Date(`${iso}T00:00:00Z`).getTime() < Date.now() - 86_400_000) continue;
          candidates.push(iso);
        }

        const perDate: Array<{
          date: string;
          options: ProviderAwardOption[];
          totalPoints: number;
          cpp: number;
          routeName: string;
        }> = [];

        for (const date of candidates) {
          try {
            const dayQuery = { ...validated, departureDate: date };
            const { options: dayOptions } = await cachedFlightAwards(supabase, dayQuery);
            if (dayOptions.length === 0) continue;
            const dayCash =
              (await getCashPriceProvider().getCashPrice(dayQuery).catch(() => null))
                ?.priceUsd ?? 0;
            const dayAwards = dayOptions
              .map((o) => {
                const program = flexProgramByName.get(o.programName);
                if (!program) return null;
                return {
                  kind: "flight" as const,
                  program,
                  milesRequired: o.milesRequired,
                  taxesAndFees: o.taxesAndFeesUsd,
                  cashPrice: dayCash,
                  label: o.airline,
                  airline: o.airline,
                  routing: o.routing,
                  stops: o.stops,
                  durationMinutes: o.durationMinutes,
                  source: o.source,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            const dayPlaybook = buildOptimizationPlaybook(
              flexBalances ?? [],
              flexPrograms ?? [],
              flexRates ?? [],
              { ...dayQuery, type: "flight" as const },
              dayAwards,
              { maxAlternatives: 0 }
            );
            if (!dayPlaybook) continue;
            perDate.push({
              date,
              options: dayOptions,
              totalPoints: dayPlaybook.best.totalPoints,
              cpp: dayPlaybook.best.cpp,
              routeName: dayPlaybook.best.name,
            });
          } catch (err) {
            console.error(`[${requestId}] flex date ${date} failed:`, err);
          }
        }

        if (perDate.length > 0) {
          // Fewest points wins — that's what the user is optimizing.
          perDate.sort((a, b) => a.totalPoints - b.totalPoints);
          const winner = perDate[0];
          chosenDate = winner.date;
          options = winner.options;
          dateOptions = perDate
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((d) => ({
              date: d.date,
              totalPoints: d.totalPoints,
              cpp: d.cpp,
              routeName: d.routeName,
              isBest: d.date === winner.date,
            }));
        }
      }

      if (!options || options.length === 0) {
        return NextResponse.json(
          {
            error:
              "No award availability found for this route and date. Try nearby dates or airports.",
          },
          { status: 404 }
        );
      }

      const quote = await getCashPriceProvider()
        .getCashPrice({ ...validated, departureDate: chosenDate })
        .catch(() => null);
      cashPrice = quote?.priceUsd ?? 0;

      // Re-point the engine query and label at whichever date won.
      chosenDateForResponse = chosenDate;
      engineQuery = { ...validated, departureDate: chosenDate };
      queryText =
        `${validated.origin} → ${validated.destination} (${validated.cabin}, ${validated.passengers} pax)` +
        (chosenDate !== validated.departureDate ? ` · shifted to ${chosenDate}` : "");

      awardInputs = options.map((o) => ({
        programName: o.programName,
        pointsRequired: o.milesRequired,
        taxesAndFeesUsd: o.taxesAndFeesUsd,
        label: o.airline,
        kind: "flight" as const,
        flight: o,
      }));
    } else {
      const nights = daysFromToday(validated.checkOut) - daysFromToday(validated.checkIn);
      if (nights < 1) {
        return NextResponse.json(
          { error: "Check-out must be after check-in." },
          { status: 400 }
        );
      }
      if (nights > MAX_NIGHTS) {
        return NextResponse.json(
          { error: `Stays are capped at ${MAX_NIGHTS} nights per playbook.` },
          { status: 400 }
        );
      }
      const hotelQuery = { ...validated, nights };
      engineQuery = hotelQuery;
      queryText = `${validated.cityName ?? validated.cityCode} hotels · ${validated.checkIn} → ${validated.checkOut} (${nights}n, ${validated.rooms} room${validated.rooms === 1 ? "" : "s"})`;

      const provider = getHotelAwardProvider();
      providerName = provider.name;

      let options: ProviderHotelOption[] | null = null;
      let cachedCash: number | null = null;
      const { data: cached } = await supabase
        .from("hotel_cache")
        .select("results, cash_price_usd")
        .eq("city_code", validated.cityCode)
        .eq("check_in", validated.checkIn)
        .eq("check_out", validated.checkOut)
        .eq("rooms", validated.rooms)
        .gt("expires_at", new Date().toISOString())
        .order("cached_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.results && Array.isArray(cached.results)) {
        options = cached.results as unknown as ProviderHotelOption[];
        cachedCash = cached.cash_price_usd ? Number(cached.cash_price_usd) : null;
      }

      if (!options) {
        try {
          options = await provider.searchHotelAwards(hotelQuery);
        } catch (err) {
          console.error(`[${requestId}] hotel award provider failed:`, err);
          return NextResponse.json(
            {
              error:
                "Hotel award data isn't responding right now. Try again in a few minutes.",
            },
            { status: 503 }
          );
        }
      }

      if (cachedCash != null) {
        cashPrice = cachedCash;
      } else {
        const quote = await getHotelCashProvider()
          .getHotelCashPrice(hotelQuery)
          .catch(() => null);
        cashPrice = quote?.priceUsd ?? 0;
        await supabase.from("hotel_cache").insert({
          city_code: validated.cityCode,
          check_in: validated.checkIn,
          check_out: validated.checkOut,
          rooms: validated.rooms,
          guests: validated.guests,
          results: options as unknown as never,
          cash_price_usd: cashPrice || null,
          provider: providerName,
          expires_at: new Date(Date.now() + CACHE_HOURS * 3600_000).toISOString(),
        });
      }

      awardInputs = (options ?? []).map((o) => ({
        programName: o.programName,
        pointsRequired: o.pointsRequired,
        taxesAndFeesUsd: o.taxesAndFeesUsd,
        label: o.label,
        kind: "hotel" as const,
      }));
    }

    // --- Resolve to program rows and run the engine ----------------------
    const [{ data: balances }, { data: programs }, { data: transferRates }] =
      await Promise.all([
        supabase.from("points_balances").select("*").eq("user_id", user.id),
        supabase.from("loyalty_programs").select("*"),
        supabase.from("transfer_rates").select("*"),
      ]);

    const programByName = new Map((programs ?? []).map((p) => [p.name, p] as const));
    const awardOptions: AwardOption[] = [];
    for (const input of awardInputs) {
      const program = programByName.get(input.programName);
      if (!program) {
        console.warn(`[${requestId}] unknown program from provider: ${input.programName}`);
        continue;
      }
      awardOptions.push({
        kind: input.kind,
        program,
        milesRequired: input.pointsRequired,
        taxesAndFees: input.taxesAndFeesUsd,
        cashPrice,
        label: input.label,
        airline: input.flight?.airline,
        routing: input.flight?.routing,
        stops: input.flight?.stops,
        durationMinutes: input.flight?.durationMinutes,
        nights: engineQuery.type === "hotel" ? engineQuery.nights : undefined,
        city:
          engineQuery.type === "hotel"
            ? (engineQuery.cityName ?? engineQuery.cityCode)
            : undefined,
        source: input.flight?.source ?? providerName,
      });
    }

    const playbook = buildOptimizationPlaybook(
      balances ?? [],
      programs ?? [],
      transferRates ?? [],
      engineQuery,
      awardOptions,
      { providerName }
    );

    if (!playbook) {
      // Surface the cheapest award and what they'd be short, so the client can
      // ask for card suggestions that actually close THIS gap.
      const cheapest = [...awardOptions].sort(
        (a, b) => a.milesRequired - b.milesRequired
      )[0];
      const held =
        (balances ?? []).find((b) => b.program_id === cheapest?.program.id)
          ?.balance ?? 0;
      const units = validated.type === "flight" ? validated.passengers : validated.rooms;
      const needed = cheapest ? cheapest.milesRequired * units : 0;

      return NextResponse.json(
        {
          error:
            "We found award options, but none are reachable with your current balances. Add balances on the Points page, then try again.",
          shortfall:
            cheapest && needed > held
              ? {
                  programName: cheapest.program.name,
                  gapPoints: needed - held,
                }
              : undefined,
        },
        { status: 404 }
      );
    }

    const { data: saved, error: saveError } = await supabase
      .from("playbooks")
      .insert({
        user_id: user.id,
        type: validated.type,
        query: queryText,
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

    if (saveError) console.error(`[${requestId}] error saving playbook:`, saveError);

    console.log(
      `[${requestId}] ${validated.type} playbook for ${queryText} — ${playbook.consideredCount} routes in ${Date.now() - startedAt}ms`
    );

    return NextResponse.json({
      playbookId: saved?.id ?? null,
      playbook,
      dateOptions,
      chosenDate: validated.type === "flight" ? chosenDateForResponse : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error(`[${requestId}] playbook generation error:`, error);
    return NextResponse.json(
      { error: "Failed to generate playbook" },
      { status: 500 }
    );
  }
}
