import type { createClient } from "@/lib/supabase/server";
import {
  getAwardProvider,
  getCashPriceProvider,
  getHotelAwardProvider,
  getHotelCashProvider,
  ProviderAwardOption,
  ProviderHotelOption,
} from "./index";

/** The exact client type our server helper returns, so table types resolve. */
type DB = Awaited<ReturnType<typeof createClient>>;

const CACHE_HOURS = 6;

/**
 * Cache-first provider access.
 *
 * Every provider call costs quota, and reverse search multiplies calls by the
 * number of candidate destinations. Routing all lookups through the shared
 * award_cache / hotel_cache tables means a destination priced for one user is
 * free for the next six hours for everyone.
 */

export async function cachedFlightAwards(
  supabase: DB,
  query: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    cabin: "economy" | "premium_economy" | "business" | "first";
    passengers: number;
  }
): Promise<{ options: ProviderAwardOption[]; fromCache: boolean }> {
  const { data: cached } = await supabase
    .from("award_cache")
    .select("results")
    .eq("origin", query.origin)
    .eq("destination", query.destination)
    .eq("departure_date", query.departureDate)
    .eq("cabin", query.cabin)
    .gt("expires_at", new Date().toISOString())
    .order("cached_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.results && Array.isArray(cached.results)) {
    return {
      options: cached.results as unknown as ProviderAwardOption[],
      fromCache: true,
    };
  }

  const provider = getAwardProvider();
  const options = await provider.searchAwards(query);
  await supabase.from("award_cache").insert({
    origin: query.origin,
    destination: query.destination,
    departure_date: query.departureDate,
    cabin: query.cabin,
    results: options as unknown as never,
    provider: provider.name,
    expires_at: new Date(Date.now() + CACHE_HOURS * 3600_000).toISOString(),
  });
  return { options, fromCache: false };
}

export async function cachedHotelAwards(
  supabase: DB,
  query: {
    cityCode: string;
    cityName?: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    rooms: number;
    guests: number;
  }
): Promise<{
  options: ProviderHotelOption[];
  cashPriceUsd: number;
  fromCache: boolean;
}> {
  const { data: cached } = await supabase
    .from("hotel_cache")
    .select("results, cash_price_usd")
    .eq("city_code", query.cityCode)
    .eq("check_in", query.checkIn)
    .eq("check_out", query.checkOut)
    .eq("rooms", query.rooms)
    .gt("expires_at", new Date().toISOString())
    .order("cached_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.results && Array.isArray(cached.results)) {
    return {
      options: cached.results as unknown as ProviderHotelOption[],
      cashPriceUsd: cached.cash_price_usd ? Number(cached.cash_price_usd) : 0,
      fromCache: true,
    };
  }

  const provider = getHotelAwardProvider();
  const [options, quote] = await Promise.all([
    provider.searchHotelAwards(query),
    getHotelCashProvider().getHotelCashPrice(query).catch(() => null),
  ]);
  const cashPriceUsd = quote?.priceUsd ?? 0;

  await supabase.from("hotel_cache").insert({
    city_code: query.cityCode,
    check_in: query.checkIn,
    check_out: query.checkOut,
    rooms: query.rooms,
    guests: query.guests,
    results: options as unknown as never,
    cash_price_usd: cashPriceUsd || null,
    provider: provider.name,
    expires_at: new Date(Date.now() + CACHE_HOURS * 3600_000).toISOString(),
  });

  return { options, cashPriceUsd, fromCache: false };
}

export async function flightCashPrice(query: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  passengers: number;
}): Promise<number> {
  const quote = await getCashPriceProvider()
    .getCashPrice(query)
    .catch(() => null);
  return quote?.priceUsd ?? 0;
}
