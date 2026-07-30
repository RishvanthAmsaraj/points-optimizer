/**
 * Trip allocator test — run with: npx tsx scripts/trip-allocator-test.ts
 *
 * The invariant that matters: across ALL legs, points spent from any single
 * program must never exceed that program's balance. Optimizing legs
 * independently violates this constantly; that's the bug this feature exists
 * to prevent.
 */
import { allocateTrip, TripLegInput } from "../src/lib/optimization/trip-allocator";
import { AwardOption, buildOptimizationPlaybook } from "../src/lib/optimization/engine";

const mk = (id: string, name: string, type: string) =>
  ({ id, name, type, alliance: null, point_valuation_cents: 1.5, transfer_partners: [], expiration_policy: null, created_at: "" }) as any;

const programs = [
  mk("chase", "Chase Ultimate Rewards", "bank"),
  mk("amex", "Amex Membership Rewards", "bank"),
  mk("hyatt", "World of Hyatt", "hotel"),
  mk("aeroplan", "Air Canada Aeroplan", "airline"),
  mk("krisflyer", "Singapore Airlines KrisFlyer", "airline"),
];

const edge = (from: string, to: string, extra: Partial<any> = {}) =>
  ({ id: `${from}-${to}`, from_program_id: from, to_program_id: to, ratio: 1, is_reversible: false,
     typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1, block_size: 0,
     block_bonus: 0, increment: 1000, promo_starts_at: null, promo_ends_at: null, promo_name: null, ...extra }) as any;

const rates = [
  edge("chase", "hyatt"),
  edge("chase", "aeroplan"),
  edge("chase", "krisflyer"),
  edge("amex", "aeroplan"),
  edge("amex", "krisflyer"),
];

const bal = (programId: string, balance: number) =>
  ({ id: `b-${programId}`, user_id: "u", program_id: programId, balance, last_updated: "", last_activity_at: null }) as any;

const flightAward = (program: any, miles: number): AwardOption => ({
  kind: "flight", label: "Test Air", program, milesRequired: miles, taxesAndFees: 50,
  cashPrice: 2000, airline: "Test Air", routing: ["JFK", "NRT"], stops: 0, durationMinutes: 800, source: "test",
});
const hotelAward = (program: any, points: number): AwardOption => ({
  kind: "hotel", label: "Test Hotel · 3 nights", program, milesRequired: points, taxesAndFees: 0,
  cashPrice: 900, nights: 3, city: "Tokyo", source: "test",
});

// Pool: 150k Chase + 60k Amex. Flight wants 100k, hotel wants 63k.
// Independently, BOTH legs would pick Chase (it reaches everything) and
// together demand 163k Chase — 13k more than exists.
const balances = [bal("chase", 150000), bal("amex", 60000)];

const legs: TripLegInput[] = [
  {
    id: "flight",
    label: "Flight JFK → NRT (business)",
    query: { type: "flight", origin: "JFK", destination: "NRT", departureDate: "2026-10-14", cabin: "business", passengers: 1 },
    awardOptions: [flightAward(programs[3], 100000), flightAward(programs[4], 110000)],
    cashPriceUsd: 2000,
  },
  {
    id: "hotel",
    label: "Hotel Tokyo · 3 nights",
    query: { type: "hotel", cityCode: "TYO", cityName: "Tokyo", checkIn: "2026-10-14", checkOut: "2026-10-17", nights: 3, rooms: 1, guests: 2 },
    awardOptions: [hotelAward(programs[2], 63000)],
    cashPriceUsd: 900,
  },
];

console.log("=== Naive approach: optimize each leg independently ===");
let naiveChaseSpend = 0;
for (const leg of legs) {
  const r = buildOptimizationPlaybook(balances, programs, rates, leg.query, leg.awardOptions, {});
  const chase = r?.best.pointsBreakdown.find((b) => b.programName === "Chase Ultimate Rewards");
  console.log(`  ${leg.label}: ${r?.best.name} (${r?.best.totalPoints.toLocaleString()} pts)`);
  naiveChaseSpend += chase?.amount ?? 0;
}
console.log(`  → Chase demanded across legs: ${naiveChaseSpend.toLocaleString()} of 150,000 available`);
if (naiveChaseSpend > 150000) {
  console.log(`  ✓ confirmed: naive planning overspends Chase by ${(naiveChaseSpend - 150000).toLocaleString()} — an unexecutable plan`);
}

console.log("\n=== Trip allocator ===");
const plan = allocateTrip(legs, balances, programs, rates);
for (const line of plan.narrative) console.log("  " + line);
console.log(`  Total: ${plan.totalPointsSpent.toLocaleString()} pts + $${plan.totalCashSpent.toFixed(0)} · ${plan.blendedCpp.toFixed(2)}¢/pt blended`);
console.log(`  Leftovers: ${plan.leftovers.map((l) => `${l.balance.toLocaleString()} ${l.programName}`).join(", ") || "none"}`);
console.log(`  Blockers: ${plan.blockers.length}`);

// --- INVARIANT: no program overspent ---
const spendByProgram = new Map<string, number>();
for (const leg of plan.legs) {
  if (!leg.path) continue;
  for (const entry of leg.path.pointsBreakdown) {
    spendByProgram.set(entry.programName, (spendByProgram.get(entry.programName) ?? 0) + entry.amount);
  }
}
const nameById = new Map(programs.map((p) => [p.id, p.name]));
let failed = false;
for (const b of balances) {
  const name = nameById.get(b.program_id)!;
  const spent = spendByProgram.get(name) ?? 0;
  const ok = spent <= b.balance;
  console.log(`  ${ok ? "✓" : "✗"} ${name}: spent ${spent.toLocaleString()} of ${b.balance.toLocaleString()}`);
  if (!ok) failed = true;
}
if (failed) throw new Error("FAIL: allocator overspent a program");

// Both legs should be funded here (Chase→flight or hotel, Amex covers the other)
const fundedCount = plan.legs.filter((l) => l.funded).length;
console.log(`  ${fundedCount === 2 ? "✓" : "✗"} both legs funded (${fundedCount}/2)`);
if (fundedCount !== 2) throw new Error("FAIL: allocator could not fund both legs despite sufficient total points");

// --- Scarcity ordering: hotel only reachable via Chase, so it must get Chase ---
const hotelLeg = plan.legs.find((l) => l.id === "hotel")!;
const usesChase = hotelLeg.path?.pointsBreakdown.some((b) => b.programName === "Chase Ultimate Rewards");
console.log(`  ${usesChase ? "✓" : "✗"} constrained leg (hotel, Chase-only) got Chase points`);
if (!usesChase) throw new Error("FAIL: scarcity ordering did not protect the constrained leg");

console.log("\nALL TRIP ALLOCATOR TESTS PASSED");
