/**
 * Scenario checker — run with: npx tsx scripts/scenario-check.ts
 *
 * Runs the three documented test scenarios from docs/TESTING.md through the
 * REAL mock provider and REAL engine (no database needed), using the same
 * program/transfer data the seed scripts install. If this passes, the app
 * should behave as TESTING.md describes once seeded.
 */
import { buildOptimizationPlaybook, AwardOption } from "../src/lib/optimization/engine";
import { MockAwardProvider, MockCashPriceProvider } from "../src/lib/providers/mock";
import { ChartHotelAwardProvider, MockHotelCashProvider } from "../src/lib/providers/hotel-charts";

// --- Mirror of the seeded reference data (subset relevant to scenarios) ----
const mk = (id: string, name: string, type: string) =>
  ({ id, name, type, alliance: null, point_valuation_cents: 1.5, transfer_partners: [], expiration_policy: null, created_at: "" }) as any;

const programs = [
  mk("chase", "Chase Ultimate Rewards", "bank"),
  mk("amex", "Amex Membership Rewards", "bank"),
  mk("marriott", "Marriott Bonvoy", "hotel"),
  mk("aeroplan", "Air Canada Aeroplan", "airline"),
  mk("united", "United MileagePlus", "airline"),
  mk("flyingblue", "Air France-KLM Flying Blue", "airline"),
  mk("krisflyer", "Singapore Airlines KrisFlyer", "airline"),
  mk("aa", "American Airlines AAdvantage", "airline"),
  mk("virgin", "Virgin Atlantic Flying Club", "airline"),
  mk("alaska", "Alaska Airlines Atmos Rewards", "airline"),
  mk("hyatt", "World of Hyatt", "hotel"),
  mk("hilton", "Hilton Honors", "hotel"),
  mk("ihg", "IHG One Rewards", "hotel"),
];
const P = new Map(programs.map((p) => [p.id, p]));

const edge = (from: string, to: string, extra: Partial<any> = {}) =>
  ({ id: `${from}-${to}`, from_program_id: from, to_program_id: to, ratio: 1, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1, block_size: 0, block_bonus: 0, increment: 1000, ...extra }) as any;

// Same shape as scripts/seed-transfer-rates.ts for these programs
const rates = [
  edge("chase", "united"),
  edge("chase", "aeroplan"),
  edge("chase", "flyingblue"),
  edge("chase", "virgin"),
  edge("chase", "krisflyer", { typical_timing: "Same day" }),
  edge("chase", "marriott", { typical_timing: "Same day" }),
  edge("amex", "aeroplan"),
  edge("amex", "flyingblue"),
  edge("amex", "virgin"),
  edge("amex", "krisflyer", { typical_timing: "Same day" }),
  edge("marriott", "alaska", { ratio: 0.3333, block_size: 60000, block_bonus: 5000, increment: 3000, minimum_transfer: 3000, typical_timing: "3-5 days" }),
  edge("marriott", "aa", { ratio: 0.3333, block_size: 60000, block_bonus: 5000, increment: 3000, minimum_transfer: 3000, typical_timing: "3-5 days" }),
  edge("marriott", "united", { ratio: 0.3333, block_size: 60000, block_bonus: 5000, increment: 3000, minimum_transfer: 3000, typical_timing: "3-5 days" }),
  edge("chase", "hyatt"),
  edge("chase", "ihg"),
  edge("amex", "hilton", { ratio: 2.0 }),
];

const bal = (programId: string, balance: number) =>
  ({ id: `b-${programId}`, user_id: "u", program_id: programId, balance, last_updated: "" }) as any;

const awardProvider = new MockAwardProvider();
const cashProvider = new MockCashPriceProvider();

async function run(
  label: string,
  balances: any[],
  query: { origin: string; destination: string; departureDate: string; cabin: "economy" | "premium_economy" | "business" | "first"; passengers: number }
) {
  const q = { type: "flight" as const, ...query };
  const providerOptions = await awardProvider.searchAwards(q);
  const cash = await cashProvider.getCashPrice(q);
  const byName = new Map(programs.map((p) => [p.name, p]));
  const awards: AwardOption[] = providerOptions
    .filter((o) => byName.has(o.programName))
    .map((o) => ({
      kind: "flight" as const,
      label: o.airline,
      program: byName.get(o.programName)!,
      milesRequired: o.milesRequired,
      taxesAndFees: o.taxesAndFeesUsd,
      cashPrice: cash?.priceUsd ?? 0,
      airline: o.airline,
      routing: o.routing,
      stops: o.stops,
      durationMinutes: o.durationMinutes,
      source: o.source,
    }));

  const result = buildOptimizationPlaybook(balances, programs, rates, q, awards, {
    providerName: "mock",
  });

  console.log(`\n=== ${label} ===`);
  console.log(
    `Award space (mock): ${providerOptions.map((o) => `${o.programName} ${o.milesRequired.toLocaleString()}`).join(" | ")}`
  );
  console.log(`Cash fare (mock): $${cash?.priceUsd.toLocaleString()}`);
  if (!result) {
    console.log("No reachable routes.");
    return;
  }
  console.log(`BEST: ${result.best.name} — ${result.best.totalPoints.toLocaleString()} pts, ${result.best.cpp.toFixed(2)}¢/pt, ${result.best.warnings.length} warning(s)`);
  for (const s of result.best.steps) console.log(`   • ${s.description}`);
  console.log(`Alternatives (${result.alternatives.length}):`);
  for (const a of result.alternatives)
    console.log(`   - ${a.name} — ${a.totalPoints.toLocaleString()} pts, ${a.cpp.toFixed(2)}¢/pt`);
  return result;
}

async function main() {
  // Scenario A — flagship: comfortable Chase balance + some Marriott
  const a = await run(
    "Scenario A · JFK→NRT business · Chase 200k + Marriott 20k",
    [bal("chase", 200000), bal("marriott", 20000)],
    { origin: "JFK", destination: "NRT", departureDate: "2026-10-14", cabin: "business", passengers: 1 }
  );
  if (!a) throw new Error("Scenario A produced no result");

  // Scenario B — split-source: no single program covers
  const b = await run(
    "Scenario B · JFK→SIN economy · Chase 40k + Amex 30k",
    [bal("chase", 40000), bal("amex", 30000)],
    { origin: "JFK", destination: "SIN", departureDate: "2026-11-05", cabin: "economy", passengers: 1 }
  );
  if (!b) throw new Error("Scenario B produced no result");
  const hasSplit = [b.best, ...b.alternatives].some((p) => p.name.includes(" + "));
  console.log(hasSplit ? "✓ split-source route present" : "✗ split-source route MISSING");

  // Scenario C — two-hop: only Chase held; Alaska reachable only via Marriott
  const c = await run(
    "Scenario C · JFK→NRT business · Chase 300k only",
    [bal("chase", 300000)],
    { origin: "JFK", destination: "NRT", departureDate: "2026-10-14", cabin: "business", passengers: 1 }
  );
  if (!c) throw new Error("Scenario C produced no result");
  const hasTwoHop = [c.best, ...c.alternatives].some((p) => p.name.includes("Marriott Bonvoy →"));
  console.log(hasTwoHop ? "✓ two-hop Marriott chain present" : "✗ two-hop chain MISSING (Alaska may not show space for this date — pick another date)");

  // Scenario D — hotel playbook: Chase-funded Hyatt stay in Tokyo
  const hotelProvider = new ChartHotelAwardProvider();
  const hotelCash = new MockHotelCashProvider();
  const hq = { type: "hotel" as const, cityCode: "TYO", cityName: "Tokyo", checkIn: "2026-10-14", checkOut: "2026-10-17", nights: 3, rooms: 1, guests: 2 };
  const hotelOptions = await hotelProvider.searchHotelAwards(hq);
  const hcash = await hotelCash.getHotelCashPrice(hq);
  const byName = new Map(programs.map((p) => [p.name, p]));
  const hotelAwards: AwardOption[] = hotelOptions
    .filter((o) => byName.has(o.programName))
    .map((o) => ({
      kind: "hotel" as const,
      label: o.label,
      program: byName.get(o.programName)!,
      milesRequired: o.pointsRequired,
      taxesAndFees: o.taxesAndFeesUsd,
      cashPrice: hcash?.priceUsd ?? 0,
      nights: hq.nights,
      city: hq.cityName,
      source: o.source,
    }));
  const d = buildOptimizationPlaybook(
    [bal("chase", 120000), bal("amex", 80000)],
    programs, rates, hq, hotelAwards, { providerName: "charts" }
  );
  console.log(`\n=== Scenario D · Tokyo hotel 3 nights · Chase 120k + Amex 80k ===`);
  console.log(`Hotel award space: ${hotelOptions.map((o) => `${o.programName} ${o.pointsRequired.toLocaleString()}`).join(" | ")}`);
  console.log(`Cash comparison (mock): $${hcash?.priceUsd.toLocaleString()}`);
  if (!d) throw new Error("Scenario D produced no result");
  console.log(`BEST: ${d.best.name} — ${d.best.totalPoints.toLocaleString()} pts, ${d.best.cpp.toFixed(2)}¢/pt`);
  for (const s of d.best.steps) console.log(`   • ${s.description}`);
  if (d.best.floor) console.log(`   floor: $${d.best.floor.floorValueUsd.toFixed(0)} cash-out → this redemption = ${d.best.floor.multiple.toFixed(1)}× the floor`);
  const hyattReachable = [d.best, ...d.alternatives].some((p) => p.name.includes("World of Hyatt"));
  console.log(hyattReachable ? "✓ Hyatt path present (Chase transfer)" : "✗ Hyatt path missing");
  const hasFloor = !!d.best.floor;
  console.log(hasFloor ? "✓ cash-out floor computed" : "✗ floor missing");
}

main();
