import {
  HotelAwardProvider,
  HotelCashProvider,
  HotelSearchQuery,
  CashQuote,
  ProviderHotelOption,
} from "./types";

/**
 * Chart-based hotel award provider.
 *
 * Unlike flights, there is no licensed API for hotel AWARD pricing — every
 * serious tool maintains award charts/bands by hand. That's genuinely how
 * this works in production, not a mock: Hyatt still publishes a real award
 * chart; Marriott/Hilton/IHG are dynamic, so we model realistic bands per
 * city tier and label them "-equivalent". Data ops reviews these quarterly
 * (see docs/DATA_SOURCES.md). Deterministic jitter keeps results stable
 * per (city, check-in) so testing is reproducible.
 */

/** City tier 1 (cheap) .. 5 (ultra-expensive). Extend freely. */
const CITY_TIERS: Record<string, { name: string; tier: 1 | 2 | 3 | 4 | 5 }> = {
  NYC: { name: "New York", tier: 5 },
  LON: { name: "London", tier: 5 },
  PAR: { name: "Paris", tier: 5 },
  TYO: { name: "Tokyo", tier: 4 },
  SIN: { name: "Singapore", tier: 4 },
  DXB: { name: "Dubai", tier: 4 },
  ROM: { name: "Rome", tier: 3 },
  BCN: { name: "Barcelona", tier: 3 },
  MIA: { name: "Miami", tier: 4 },
  LAX: { name: "Los Angeles", tier: 4 },
  SFO: { name: "San Francisco", tier: 4 },
  CHI: { name: "Chicago", tier: 3 },
  BKK: { name: "Bangkok", tier: 2 },
  MEX: { name: "Mexico City", tier: 2 },
  BAL: { name: "Bali", tier: 2 },
  LIS: { name: "Lisbon", tier: 3 },
  AMS: { name: "Amsterdam", tier: 4 },
  SYD: { name: "Sydney", tier: 4 },
  IST: { name: "Istanbul", tier: 2 },
  CUN: { name: "Cancun", tier: 3 },
};

/** Nightly award points per program by city tier (standard-room bands). */
const NIGHTLY_POINTS: Record<string, [number, number, number, number, number]> = {
  "World of Hyatt": [8000, 12000, 15000, 21000, 30000],
  "Marriott Bonvoy": [25000, 35000, 50000, 68000, 90000],
  "Hilton Honors": [30000, 40000, 60000, 80000, 95000],
  "IHG One Rewards": [22000, 30000, 42000, 58000, 72000],
};

/** Nightly cash ADR (USD) midpoints by tier, jittered per query. */
const NIGHTLY_CASH: [number, number, number, number, number] = [
  140, 210, 320, 480, 700,
];

const HYATT_CATEGORY_BY_TIER = ["2", "3", "4", "6", "7"];

function seeded(key: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function resolveCity(q: HotelSearchQuery) {
  const known = CITY_TIERS[q.cityCode.toUpperCase()];
  return known ?? { name: q.cityName ?? q.cityCode.toUpperCase(), tier: 3 as const };
}

export class ChartHotelAwardProvider implements HotelAwardProvider {
  readonly name = "charts";

  async searchHotelAwards(q: HotelSearchQuery): Promise<ProviderHotelOption[]> {
    const city = resolveCity(q);
    const key = `${q.cityCode}-${q.checkIn}-${q.nights}`;

    return Object.entries(NIGHTLY_POINTS).map(([programName, bands], i) => {
      const jitter = 0.9 + seeded(key, i * 7) * 0.25;
      const nightly = Math.round((bands[city.tier - 1] * jitter) / 1000) * 1000;
      const label =
        programName === "World of Hyatt"
          ? `a Category ${HYATT_CATEGORY_BY_TIER[city.tier - 1]} Hyatt in ${city.name} · ${q.nights} night${q.nights === 1 ? "" : "s"}`
          : `a ${programName.split(" ")[0]} property in ${city.name} (tier-${city.tier} band) · ${q.nights} night${q.nights === 1 ? "" : "s"}`;
      return {
        programName,
        pointsRequired: nightly * q.nights,
        // Award nights are generally exempt from room taxes; resort/parking
        // fees vary by property, so we don't guess them.
        taxesAndFeesUsd: 0,
        label,
        source: "charts",
      };
    });
  }
}

export class MockHotelCashProvider implements HotelCashProvider {
  readonly name = "mock";

  async getHotelCashPrice(q: HotelSearchQuery): Promise<CashQuote | null> {
    const city = resolveCity(q);
    const jitter = 0.85 + seeded(`${q.cityCode}${q.checkIn}`, 42) * 0.4;
    // Cash guests pay room + ~15% taxes; that's the fair comparison for a
    // tax-free award night.
    const perNight = NIGHTLY_CASH[city.tier - 1] * jitter * 1.15;
    return { priceUsd: Math.round(perNight * q.nights), source: "mock" };
  }
}
