/**
 * Data provider contracts.
 *
 * The app never talks to an external API directly — every source of award
 * availability or cash pricing implements one of these interfaces and is
 * selected in providers/index.ts. This is what lets us start on mock data,
 * move to Seats.aero for awards and Amadeus for cash fares, and later swap
 * or add sources (Duffel, direct partnerships) without touching the engine
 * or API routes.
 */

export interface AwardSearchQuery {
  origin: string; // IATA airport code
  destination: string; // IATA airport code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  passengers: number;
}

/** An award option as returned by a provider, keyed by program NAME.
 *  The API route resolves programName -> loyalty_programs row before
 *  handing options to the engine; unknown names are dropped with a warning. */
export interface ProviderAwardOption {
  programName: string;
  /** Miles required per passenger. */
  milesRequired: number;
  /** Taxes and fees per passenger, USD. */
  taxesAndFeesUsd: number;
  airline: string;
  routing: string[];
  stops: number;
  durationMinutes: number;
  seatsAvailable?: number;
  source: string;
}

export interface AwardProvider {
  readonly name: string;
  searchAwards(query: AwardSearchQuery): Promise<ProviderAwardOption[]>;
}

export interface CashQuote {
  priceUsd: number;
  source: string;
}

export interface CashPriceProvider {
  readonly name: string;
  getCashPrice(query: AwardSearchQuery): Promise<CashQuote | null>;
}
