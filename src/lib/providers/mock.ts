import {
  AwardProvider,
  AwardSearchQuery,
  CashPriceProvider,
  CashQuote,
  ProviderAwardOption,
} from "./types";

/**
 * Deterministic mock data for development and demos.
 *
 * Not random noise: miles and cash prices are derived from great-circle
 * distance between real airport coordinates with cabin multipliers, and the
 * same query always returns the same results (seeded by the route string).
 * This makes the playbook UI, engine, and caching testable end-to-end
 * without any API keys.
 */

const AIRPORTS: Record<string, [number, number]> = {
  JFK: [40.64, -73.78], LGA: [40.78, -73.87], EWR: [40.69, -74.17],
  LAX: [33.94, -118.41], SFO: [37.62, -122.38], SEA: [47.45, -122.31],
  ORD: [41.97, -87.91], DFW: [32.9, -97.04], MIA: [25.8, -80.29],
  ATL: [33.64, -84.43], BOS: [42.36, -71.01], DEN: [39.86, -104.67],
  LHR: [51.47, -0.45], CDG: [49.01, 2.55], AMS: [52.31, 4.76],
  FRA: [50.03, 8.56], MAD: [40.5, -3.57], FCO: [41.8, 12.24],
  NRT: [35.77, 140.39], HND: [35.55, 139.78], ICN: [37.46, 126.44],
  SIN: [1.36, 103.99], HKG: [22.31, 113.91], BKK: [13.69, 100.75],
  SYD: [-33.94, 151.18], DXB: [25.25, 55.36], DOH: [25.27, 51.61],
  GRU: [-23.44, -46.47], MEX: [19.44, -99.07], YYZ: [43.68, -79.63],
};

function distanceMiles(a: string, b: string): number {
  const ca = AIRPORTS[a];
  const cb = AIRPORTS[b];
  if (!ca || !cb) return 5500; // long-haul default for unknown airports
  const rad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lon1] = ca.map(rad);
  const [lat2, lon2] = cb.map(rad);
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return Math.round(3959 * 2 * Math.asin(Math.sqrt(h)));
}

/** Small deterministic hash -> 0..1, so results are stable per query. */
function seeded(key: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// Cabin multipliers over the economy award rate
const CABIN_MILES_MULT = { economy: 1, premium_economy: 1.7, business: 3.2, first: 5 };
const CABIN_CASH_MULT = { economy: 1, premium_economy: 2.2, business: 4.5, first: 7.5 };

interface MockProgram {
  programName: string;
  airline: string;
  /** Award miles charged per flown mile, one-way economy. */
  rate: number;
  feesUsd: number;
}

const MOCK_PROGRAMS: MockProgram[] = [
  { programName: "Air Canada Aeroplan", airline: "Air Canada / Star Alliance", rate: 4.6, feesUsd: 65 },
  { programName: "United MileagePlus", airline: "United / Star Alliance", rate: 5.6, feesUsd: 45 },
  { programName: "Air France-KLM Flying Blue", airline: "Air France / SkyTeam", rate: 4.9, feesUsd: 190 },
  { programName: "Singapore Airlines KrisFlyer", airline: "Singapore Airlines", rate: 5.1, feesUsd: 120 },
  { programName: "American Airlines AAdvantage", airline: "American / oneworld", rate: 5.4, feesUsd: 40 },
  { programName: "Virgin Atlantic Flying Club", airline: "Virgin Atlantic / partners", rate: 4.2, feesUsd: 320 },
  { programName: "Alaska Airlines Atmos Rewards", airline: "Alaska / oneworld partners", rate: 4.4, feesUsd: 55 },
];

export class MockAwardProvider implements AwardProvider {
  readonly name = "mock";

  async searchAwards(q: AwardSearchQuery): Promise<ProviderAwardOption[]> {
    const dist = distanceMiles(q.origin, q.destination);
    const legs = q.returnDate ? 2 : 1;
    const key = `${q.origin}-${q.destination}-${q.departureDate}-${q.cabin}`;

    return MOCK_PROGRAMS.filter((_, i) => seeded(key, i) > 0.25) // ~5 of 7 show space
      .map((p, i) => {
        const jitter = 0.85 + seeded(key, i * 7 + 1) * 0.4;
        const miles =
          Math.round((dist * p.rate * CABIN_MILES_MULT[q.cabin] * legs * jitter) / 500) * 500;
        const stops = dist > 4500 ? (seeded(key, i * 3) > 0.5 ? 1 : 0) : seeded(key, i * 3) > 0.8 ? 1 : 0;
        const via = stops === 1 ? Object.keys(AIRPORTS)[Math.floor(seeded(key, i * 11) * 20)] : null;
        return {
          programName: p.programName,
          milesRequired: Math.max(miles, 7500),
          taxesAndFeesUsd: Math.round(p.feesUsd * legs * (0.8 + seeded(key, i * 5) * 0.5)),
          airline: p.airline,
          routing: via ? [q.origin, via, q.destination] : [q.origin, q.destination],
          stops,
          durationMinutes: Math.round((dist / 500) * 60 + stops * 150),
          seatsAvailable: 1 + Math.floor(seeded(key, i * 13) * 4),
          source: "mock",
        };
      });
  }
}

export class MockCashPriceProvider implements CashPriceProvider {
  readonly name = "mock";

  async getCashPrice(q: AwardSearchQuery): Promise<CashQuote | null> {
    const dist = distanceMiles(q.origin, q.destination);
    const legs = q.returnDate ? 2 : 1;
    const jitter = 0.85 + seeded(`${q.origin}${q.destination}${q.departureDate}`, 99) * 0.4;
    const price = Math.round((120 + dist * 0.11) * CABIN_CASH_MULT[q.cabin] * legs * jitter);
    return { priceUsd: price, source: "mock" };
  }
}
