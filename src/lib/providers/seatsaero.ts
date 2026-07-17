import {
  AwardProvider,
  AwardSearchQuery,
  ProviderAwardOption,
} from "./types";

/**
 * Seats.aero Partner API adapter.
 *
 * Seats.aero maintains a cache of award availability across ~20 mileage
 * programs and licenses it through a Partner API — this is the realistic
 * way to get award data legally (scraping airline sites violates their
 * terms of service and breaks constantly). Access requires applying for a
 * partner key: https://developers.seats.aero
 *
 * IMPORTANT BEFORE PRODUCTION:
 * - Verify field names against the current API docs. This adapter is
 *   written against the documented cached-search response shape but the
 *   API evolves; the defensive parsing below drops anything it can't read.
 * - Respect rate limits (they meter by request); we cache results in the
 *   award_searches table for 6h so repeat queries don't burn quota.
 * - Their data is CACHED availability — always tell users to confirm space
 *   with the airline before transferring points (the engine adds this
 *   warning automatically to irreversible hops).
 */

const BASE_URL = "https://seats.aero/partnerapi";

/** Seats.aero source code -> our loyalty_programs.name */
const SOURCE_TO_PROGRAM: Record<string, string> = {
  aeroplan: "Air Canada Aeroplan",
  united: "United MileagePlus",
  american: "American Airlines AAdvantage",
  delta: "Delta SkyMiles",
  alaska: "Alaska Airlines Atmos Rewards",
  flyingblue: "Air France-KLM Flying Blue",
  virginatlantic: "Virgin Atlantic Flying Club",
  singapore: "Singapore Airlines KrisFlyer",
  british: "British Airways Executive Club",
  turkish: "Turkish Airlines Miles&Smiles",
  lifemiles: "Avianca LifeMiles",
  emirates: "Emirates Skywards",
  qantas: "Qantas Frequent Flyer",
  etihad: "Etihad Guest",
};

const CABIN_FIELDS = {
  economy: { available: "YAvailable", cost: "YMileageCost", fees: "YTotalTaxes", seats: "YRemainingSeats", direct: "YDirect" },
  premium_economy: { available: "WAvailable", cost: "WMileageCost", fees: "WTotalTaxes", seats: "WRemainingSeats", direct: "WDirect" },
  business: { available: "JAvailable", cost: "JMileageCost", fees: "JTotalTaxes", seats: "JRemainingSeats", direct: "JDirect" },
  first: { available: "FAvailable", cost: "FMileageCost", fees: "FTotalTaxes", seats: "FRemainingSeats", direct: "FDirect" },
} as const;

export class SeatsAeroProvider implements AwardProvider {
  readonly name = "seatsaero";
  constructor(private apiKey: string) {}

  async searchAwards(q: AwardSearchQuery): Promise<ProviderAwardOption[]> {
    const params = new URLSearchParams({
      origin_airport: q.origin,
      destination_airport: q.destination,
      start_date: q.departureDate,
      end_date: q.departureDate,
      take: "50",
    });

    const res = await fetch(`${BASE_URL}/search?${params}`, {
      headers: {
        "Partner-Authorization": this.apiKey,
        Accept: "application/json",
      },
      // Never let a slow upstream hang the playbook request.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`Seats.aero error ${res.status}: ${await res.text()}`);
      return [];
    }

    const payload = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const rows = payload.data ?? [];
    const fields = CABIN_FIELDS[q.cabin];
    const options: ProviderAwardOption[] = [];

    for (const row of rows) {
      try {
        if (!row[fields.available]) continue;

        const source = String(row["Source"] ?? "");
        const programName = SOURCE_TO_PROGRAM[source];
        if (!programName) continue; // program we don't model yet

        const miles = Number(row[fields.cost]);
        if (!Number.isFinite(miles) || miles <= 0) continue;

        const seats = Number(row[fields.seats] ?? 0);
        if (seats > 0 && seats < q.passengers) continue;

        const route = row["Route"] as Record<string, unknown> | undefined;
        const origin = String(route?.["OriginAirport"] ?? q.origin);
        const destination = String(route?.["DestinationAirport"] ?? q.destination);
        // Taxes come back in cents in most sources; fall back to a
        // conservative estimate when absent.
        const rawFees = Number(row[fields.fees]);
        const feesUsd = Number.isFinite(rawFees) && rawFees > 0 ? rawFees / 100 : 60;

        options.push({
          programName,
          milesRequired: miles,
          taxesAndFeesUsd: Math.round(feesUsd),
          airline: programName.split(" ")[0],
          routing: row[fields.direct] ? [origin, destination] : [origin, "…", destination],
          stops: row[fields.direct] ? 0 : 1,
          durationMinutes: 0, // cached search doesn't include duration; trip detail API does
          seatsAvailable: seats || undefined,
          source: `seats.aero:${source}`,
        });
      } catch {
        continue; // defensive: skip malformed rows rather than failing the search
      }
    }

    // Keep the cheapest option per program for the engine.
    const bestPerProgram = new Map<string, ProviderAwardOption>();
    for (const opt of options) {
      const existing = bestPerProgram.get(opt.programName);
      if (!existing || opt.milesRequired < existing.milesRequired) {
        bestPerProgram.set(opt.programName, opt);
      }
    }
    return [...bestPerProgram.values()];
  }
}
