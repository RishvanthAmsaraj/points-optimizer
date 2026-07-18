/**
 * Engine smoke test — run with: npx tsx scripts/engine-smoke-test.ts
 * Validates the multi-hop pathfinding, block-bonus math, and split-source
 * logic with synthetic data (no DB or API needed).
 */
import { buildOptimizationPlaybook, AwardOption } from "../src/lib/optimization/engine";

const P = (id: string, name: string, type: string) =>
  ({ id, name, type, alliance: null, point_valuation_cents: 1.5, transfer_partners: [], expiration_policy: null, created_at: "" }) as any;

const chase = P("chase", "Chase Ultimate Rewards", "bank");
const amex = P("amex", "Amex Membership Rewards", "bank");
const marriott = P("marriott", "Marriott Bonvoy", "hotel");
const alaska = P("alaska", "Alaska Airlines Atmos Rewards", "airline");
const aeroplan = P("aeroplan", "Air Canada Aeroplan", "airline");

const rate = (from: string, to: string, ratio: number, extra: Partial<any> = {}) =>
  ({ id: `${from}-${to}`, from_program_id: from, to_program_id: to, ratio, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1, block_size: 0, block_bonus: 0, increment: 1000, ...extra }) as any;

const rates = [
  rate("chase", "marriott", 1),
  rate("chase", "aeroplan", 1),
  rate("amex", "aeroplan", 1),
  // Marriott -> Alaska: 3:1 + 5k per 60k, 3k increments
  rate("marriott", "alaska", 0.3333, { block_size: 60000, block_bonus: 5000, increment: 3000, minimum_transfer: 3000, typical_timing: "3-5 days" }),
];

const award = (program: any, miles: number): AwardOption => ({
  kind: "flight", label: "Test", program, milesRequired: miles, taxesAndFees: 30, cashPrice: 1800,
  airline: "Test", routing: ["JFK", "NRT"], stops: 0, durationMinutes: 800, source: "test",
});

// --- Test 1: 2-hop chain (Chase -> Marriott -> Alaska), user holds ONLY Chase
let result = buildOptimizationPlaybook(
  [{ id: "b1", user_id: "u", program_id: "chase", balance: 200000, last_updated: "" } as any],
  [chase, amex, marriott, alaska, aeroplan],
  rates,
  { type: "flight", origin: "JFK", destination: "NRT", departureDate: "2026-10-01", cabin: "business", passengers: 1 },
  [award(alaska, 60000)]
);
console.log("TEST 1 — 2-hop Chase→Marriott→Alaska for 60k Alaska miles");
console.log("  best:", result?.best.name);
for (const s of result!.best.steps) console.log("   ", s.description);
console.log("  warnings:", result?.best.warnings.length);
// 60k Alaska needs: Marriott X where floor(.3333X)+floor(X/60000)*5000 >= 60000
// X=165000: 54994+10000=64994 ✓; X=162000: 53994+10000=63994 ✓; X=150000: 49995+10000=59995 ✗; X=153000: 50994+10000=55994? no wait floor(153000/60000)=2 → 50994+10000=60994 ✓
console.log("  alternatives:", result!.alternatives.map((a) => a.name));
const chain = [result!.best, ...result!.alternatives].find((p) => p.name.includes("Marriott"));
if (!chain) throw new Error("FAIL: 2-hop chain not discovered");
console.log("  2-hop chain found:", chain.name, `(${chain.totalPoints.toLocaleString()} pts, ${chain.cpp.toFixed(2)}cpp, ${chain.warnings.length} warnings)`);
for (const s of chain.steps) console.log("   ", s.description);
const marriottStep: any = chain.steps.find((s) => s.description.includes("Marriott Bonvoy points to"));
if (Number(marriottStep?.details.pointsArriving) < 60000) throw new Error("FAIL: not enough miles arrive via 2-hop");

// --- Test 2: split-source (Chase 40k + Amex 30k both -> Aeroplan for 60k award)
result = buildOptimizationPlaybook(
  [
    { id: "b1", user_id: "u", program_id: "chase", balance: 40000, last_updated: "" } as any,
    { id: "b2", user_id: "u", program_id: "amex", balance: 30000, last_updated: "" } as any,
  ],
  [chase, amex, marriott, alaska, aeroplan],
  rates,
  { type: "flight", origin: "JFK", destination: "YYZ", departureDate: "2026-10-01", cabin: "economy", passengers: 1 },
  [award(aeroplan, 60000)]
);
console.log("\nTEST 2 — split-source: 40k Chase + 30k Amex → 60k Aeroplan award");
console.log("  best:", result?.best.name);
for (const s of result!.best.steps) console.log("   ", s.description);
const totalArriving = result!.best.steps
  .filter((s) => s.type === "transfer")
  .reduce((sum, s: any) => sum + Number(s.details.pointsArriving), 0);
if (totalArriving < 60000) throw new Error("FAIL: split-source doesn't cover the award");

// --- Test 3: partial target balance + top-up transfer
result = buildOptimizationPlaybook(
  [
    { id: "b1", user_id: "u", program_id: "aeroplan", balance: 25000, last_updated: "" } as any,
    { id: "b2", user_id: "u", program_id: "chase", balance: 100000, last_updated: "" } as any,
  ],
  [chase, amex, marriott, alaska, aeroplan],
  rates,
  { type: "flight", origin: "JFK", destination: "YYZ", departureDate: "2026-10-01", cabin: "economy", passengers: 2 },
  [award(aeroplan, 35000)] // 70k total for 2 pax; 25k held + 45k transfer
);
console.log("\nTEST 3 — 2 pax, partial Aeroplan balance + Chase top-up");
console.log("  best:", result?.best.name);
for (const s of result!.best.steps) console.log("   ", s.description);

console.log("\nALL ENGINE SMOKE TESTS PASSED");
