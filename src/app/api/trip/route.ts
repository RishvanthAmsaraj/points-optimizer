import { createClient } from "@/lib/supabase/server";
import { AwardOption, TravelQuery } from "@/lib/optimization/engine";
import { allocateTrip, TripLegInput } from "@/lib/optimization/trip-allocator";
import { getStayEnhancements } from "@/lib/optimization/stay-enhancements";
import {
  getAwardProvider,
  getCashPriceProvider,
  getHotelAwardProvider,
  getHotelCashProvider,
} from "@/lib/providers";
import { toExperienceOptions } from "@/lib/providers/experiences";
import { NextResponse } from "next/server";
import { z } from "zod";

const IATA = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * TRIP PLANNER — one points pool, many goals.
 *
 * Each requested component becomes a "leg". The allocator funds them in
 * scarcity order against a shrinking pool so the same points are never spent
 * twice, then reports leftovers and any leg that needs cash instead.
 */
const tripSchema = z
  .object({
    name: z.string().min(1).max(80).default("My trip"),
    flight: z
      .object({
        origin: z.string().length(3).regex(IATA),
        destination: z.string().length(3).regex(IATA),
        departureDate: z.string().regex(DATE),
        returnDate: z.string().regex(DATE).optional(),
        cabin: z
          .enum(["economy", "premium_economy", "business", "first"])
          .default("economy"),
        passengers: z.number().int().min(1).max(9).default(1),
      })
      .optional(),
    hotel: z
      .object({
        cityCode: z.string().length(3).regex(IATA),
        cityName: z.string().max(60).optional(),
        checkIn: z.string().regex(DATE),
        checkOut: z.string().regex(DATE),
        rooms: z.number().int().min(1).max(4).default(1),
        guests: z.number().int().min(1).max(8).default(2),
      })
      .optional(),
    experience: z
      .object({
        cityCode: z.string().length(3).regex(IATA),
        budgetUsd: z.number().min(50).max(10000).default(400),
        /** Specific catalog row; otherwise we pick the best-value option. */
        experienceId: z.string().uuid().optional(),
        optional: z.boolean().default(true),
      })
      .optional(),
  })
  .refine((v) => v.flight || v.hotel || v.experience, {
    message: "Add at least one component to plan a trip.",
  });

const FREE_TRIPS_PER_MONTH = Number(process.env.TRIP_FREE_LIMIT ?? 1);
const TRIPS_PER_HOUR = 6;

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() -
      new Date(`${checkIn}T00:00:00Z`).getTime()) /
      86_400_000
  );
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

    const input = tripSchema.parse(await request.json());

    // --- Rate limit + tier ------------------------------------------------
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: hourCount } = await supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", hourAgo);
    if ((hourCount ?? 0) >= TRIPS_PER_HOUR) {
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
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= FREE_TRIPS_PER_MONTH) {
        return NextResponse.json(
          {
            error: `Full trip plans are a premium feature — you've used your ${FREE_TRIPS_PER_MONTH} free plan this month. Single flight and hotel playbooks are still unlimited on the free tier.`,
            upgrade: true,
          },
          { status: 403 }
        );
      }
    }

    // --- Reference data ---------------------------------------------------
    const [{ data: balances }, { data: programs }, { data: transferRates }] =
      await Promise.all([
        supabase.from("points_balances").select("*").eq("user_id", user.id),
        supabase.from("loyalty_programs").select("*"),
        supabase.from("transfer_rates").select("*"),
      ]);

    if (!balances || balances.length === 0) {
      return NextResponse.json(
        {
          error:
            "Add your points balances first — a trip plan needs to know what it's spending.",
        },
        { status: 400 }
      );
    }

    const programByName = new Map((programs ?? []).map((p) => [p.name, p] as const));
    const heldProgramNames = balances
      .map((b) => (programs ?? []).find((p) => p.id === b.program_id)?.name)
      .filter((n): n is string => !!n);

    const legs: TripLegInput[] = [];
    const enhancements: Record<string, ReturnType<typeof getStayEnhancements>> = {};

    // --- Flight leg -------------------------------------------------------
    if (input.flight) {
      const q: TravelQuery = { type: "flight", ...input.flight };
      const provider = getAwardProvider();
      const [options, cashQuote] = await Promise.all([
        provider.searchAwards(input.flight).catch((err) => {
          console.error(`[${requestId}] flight provider failed:`, err);
          return [];
        }),
        getCashPriceProvider().getCashPrice(input.flight).catch(() => null),
      ]);
      const cashPrice = cashQuote?.priceUsd ?? 0;
      const awardOptions: AwardOption[] = options
        .map((o): AwardOption | null => {
          const program = programByName.get(o.programName);
          if (!program) return null;
          return {
            kind: "flight" as const,
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

      legs.push({
        id: "flight",
        label: `Flight ${input.flight.origin} → ${input.flight.destination} (${input.flight.cabin.replace("_", " ")}, ${input.flight.passengers} pax)`,
        query: q,
        awardOptions,
        cashPriceUsd: cashPrice * input.flight.passengers,
      });
    }

    // --- Hotel leg --------------------------------------------------------
    if (input.hotel) {
      const nights = nightsBetween(input.hotel.checkIn, input.hotel.checkOut);
      if (nights < 1) {
        return NextResponse.json(
          { error: "Hotel check-out must be after check-in." },
          { status: 400 }
        );
      }
      const hotelQuery = { ...input.hotel, nights };
      const q: TravelQuery = { type: "hotel", ...hotelQuery };
      const provider = getHotelAwardProvider();
      const [options, cashQuote] = await Promise.all([
        provider.searchHotelAwards(hotelQuery).catch((err) => {
          console.error(`[${requestId}] hotel provider failed:`, err);
          return [];
        }),
        getHotelCashProvider().getHotelCashPrice(hotelQuery).catch(() => null),
      ]);
      const cashPrice = cashQuote?.priceUsd ?? 0;
      const awardOptions: AwardOption[] = options
        .map((o): AwardOption | null => {
          const program = programByName.get(o.programName);
          if (!program) return null;
          return {
            kind: "hotel" as const,
            program,
            milesRequired: o.pointsRequired,
            taxesAndFees: o.taxesAndFeesUsd,
            cashPrice,
            label: o.label,
            nights,
            city: input.hotel!.cityName ?? input.hotel!.cityCode,
            source: o.source,
          };
        })
        .filter((x): x is AwardOption => x !== null);

      legs.push({
        id: "hotel",
        label: `Hotel in ${input.hotel.cityName ?? input.hotel.cityCode} · ${nights} night${nights === 1 ? "" : "s"}`,
        query: q,
        awardOptions,
        cashPriceUsd: cashPrice * input.hotel.rooms,
      });

      // Stay enhancements are computed per candidate program so the UI can
      // show "and here's how to get more than the room" for whichever wins.
      for (const o of options) {
        enhancements[o.programName] = getStayEnhancements({
          programName: o.programName,
          nights,
          pointsRequired: o.pointsRequired,
          cashPriceUsd: cashPrice,
          heldProgramNames,
        });
      }
    }

    // --- Experience leg ---------------------------------------------------
    if (input.experience) {
      let query = supabase
        .from("experiences")
        .select("*")
        .eq("is_active", true);
      query = input.experience.experienceId
        ? query.eq("id", input.experience.experienceId)
        : query.or(
            `city_code.eq.${input.experience.cityCode},city_code.is.null`
          );
      const { data: rows } = await query;
      const options = toExperienceOptions(rows ?? [], input.experience.budgetUsd);

      const awardOptions: AwardOption[] = options
        .map((o): AwardOption | null => {
          const program = programByName.get(o.programName);
          if (!program) return null;
          return {
            kind: "hotel" as const, // priced per-unit like a stay; label carries the detail
            program,
            milesRequired: o.pointsRequired,
            taxesAndFees: 0,
            cashPrice: o.cashPriceUsd,
            label: `${o.name} via ${o.channel}`,
            city: o.city ?? input.experience!.cityCode,
            source: o.isChannelRate ? "catalog:channel" : "catalog:listing",
          };
        })
        .filter((x): x is AwardOption => x !== null);

      const bestCash = Math.max(0, ...options.map((o) => o.cashPriceUsd));
      legs.push({
        id: "experience",
        label: `Experience in ${input.experience.cityCode}`,
        query: {
          type: "hotel",
          cityCode: input.experience.cityCode,
          checkIn: input.flight?.departureDate ?? input.hotel?.checkIn ?? "",
          checkOut: input.flight?.departureDate ?? input.hotel?.checkOut ?? "",
          nights: 1,
          rooms: 1,
          guests: 1,
        },
        awardOptions,
        cashPriceUsd: bestCash,
        optional: input.experience.optional,
      });
    }

    if (legs.length === 0) {
      return NextResponse.json(
        { error: "Nothing to plan — add a flight, hotel, or experience." },
        { status: 400 }
      );
    }

    // --- Allocate ---------------------------------------------------------
    const plan = allocateTrip(legs, balances, programs ?? [], transferRates ?? []);

    // --- Persist ----------------------------------------------------------
    const { data: saved, error: saveError } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        name: input.name,
        destination:
          input.hotel?.cityName ??
          input.hotel?.cityCode ??
          input.flight?.destination ??
          input.experience?.cityCode ??
          null,
        start_date: input.flight?.departureDate ?? input.hotel?.checkIn ?? null,
        end_date: input.flight?.returnDate ?? input.hotel?.checkOut ?? null,
        plan: plan as unknown as never,
        total_points: plan.totalPointsSpent,
        total_cash_usd: plan.totalCashSpent,
        value_captured_usd: plan.totalCashAvoided,
      })
      .select("id")
      .single();

    if (saveError) console.error(`[${requestId}] error saving trip:`, saveError);

    console.log(
      `[${requestId}] trip "${input.name}" — ${legs.length} legs, ${plan.totalPointsSpent} pts in ${Date.now() - startedAt}ms`
    );

    return NextResponse.json({
      tripId: saved?.id ?? null,
      plan,
      stayEnhancements: enhancements,
      disclaimer:
        "Award pricing, availability, transfer ratios, and program benefits change without notice. Confirm award space before transferring — most transfers are irreversible. Not financial advice.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error(`[${requestId}] trip planning error:`, error);
    return NextResponse.json({ error: "Failed to plan trip" }, { status: 500 });
  }
}
