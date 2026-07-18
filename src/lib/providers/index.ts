import { AmadeusCashPriceProvider } from "./amadeus";
import { AmadeusHotelCashProvider } from "./amadeus-hotels";
import { ChartHotelAwardProvider, MockHotelCashProvider } from "./hotel-charts";
import { MockAwardProvider, MockCashPriceProvider } from "./mock";
import { SeatsAeroProvider } from "./seatsaero";
import {
  AwardProvider,
  CashPriceProvider,
  HotelAwardProvider,
  HotelCashProvider,
} from "./types";

/**
 * Provider selection:
 * - AWARD_PROVIDER=seatsaero + SEATS_AERO_API_KEY  -> live award data
 * - AMADEUS_CLIENT_ID/SECRET                        -> live cash fares
 * - anything missing                                -> deterministic mocks
 *
 * The app must always work with zero keys configured (mock mode) so local
 * dev and demos never depend on external accounts.
 */

export function getAwardProvider(): AwardProvider {
  const choice = process.env.AWARD_PROVIDER ?? "mock";
  if (choice === "seatsaero") {
    const key = process.env.SEATS_AERO_API_KEY;
    if (key) return new SeatsAeroProvider(key);
    console.warn("AWARD_PROVIDER=seatsaero but SEATS_AERO_API_KEY missing — using mock");
  }
  return new MockAwardProvider();
}

export function getCashPriceProvider(): CashPriceProvider {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (id && secret) return new AmadeusCashPriceProvider(id, secret);
  return new MockCashPriceProvider();
}

export function getHotelAwardProvider(): HotelAwardProvider {
  // Chart-based is the production strategy for hotel awards (no licensed
  // award-pricing API exists) — see docs/DATA_SOURCES.md.
  return new ChartHotelAwardProvider();
}

export function getHotelCashProvider(): HotelCashProvider {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (id && secret) return new AmadeusHotelCashProvider(id, secret);
  return new MockHotelCashProvider();
}

export * from "./types";
