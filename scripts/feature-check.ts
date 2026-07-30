/**
 * Feature smoke test — run with: npx tsx scripts/feature-check.ts
 *
 * Covers the pure logic added in the "fully stacked" pass: card
 * recommendations, expiry assessment, alert construction, and experience
 * verdicts. No database or network required.
 */
import { recommendCards } from "../src/lib/optimization/card-recommendations";
import { assessExpiryRisk, inactivityMonths } from "../src/lib/optimization/expiry";
import {
  buildExpiryAlerts,
  buildTransferBonusAlerts,
  renderDigest,
} from "../src/lib/optimization/alerts";
import {
  experienceVerdict,
  toExperienceOptions,
} from "../src/lib/providers/experiences";

const mk = (id: string, name: string, type: string, policy: string | null = null) =>
  ({ id, name, type, alliance: null, point_valuation_cents: 1.5, transfer_partners: [],
     expiration_policy: policy, created_at: "" }) as any;

const chase = mk("chase", "Chase Ultimate Rewards", "bank", "Points don't expire while account is open");
const hyatt = mk("hyatt", "World of Hyatt", "hotel", "24 months of inactivity");
const alaska = mk("alaska", "Alaska Airlines Atmos Rewards", "airline", "24 months of inactivity");
const programs = [chase, hyatt, alaska];

const edge = (from: string, to: string, extra: any = {}) =>
  ({ id: `${from}-${to}`, from_program_id: from, to_program_id: to, ratio: 1,
     is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000,
     bonus_multiplier: 1, block_size: 0, block_bonus: 0, increment: 1000,
     promo_starts_at: null, promo_ends_at: null, promo_name: null, ...extra }) as any;

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// --- 1. Card recommendations ------------------------------------------------
console.log("\n=== Card recommendations ===");
const cards = [
  { id: "csp", name: "Chase Sapphire Preferred", issuer: "Chase", network: "Visa",
    annual_fee: 95, signup_bonus_points: 60000, signup_bonus_spend_required: 4000,
    category_multipliers: {}, transfer_partners: ["Chase Ultimate Rewards"],
    is_active: true, created_at: "" } as any,
  { id: "csr", name: "Chase Sapphire Reserve", issuer: "Chase", network: "Visa",
    annual_fee: 550, signup_bonus_points: 60000, signup_bonus_spend_required: 5000,
    category_multipliers: {}, transfer_partners: ["Chase Ultimate Rewards"],
    is_active: true, created_at: "" } as any,
  { id: "unrelated", name: "Some Cashback Card", issuer: "Bank", network: "Visa",
    annual_fee: 0, signup_bonus_points: 20000, signup_bonus_spend_required: 500,
    category_multipliers: {}, transfer_partners: [], is_active: true, created_at: "" } as any,
];
const rates = [edge("chase", "hyatt")];

const recs = recommendCards({
  targetProgram: hyatt, gapPoints: 40000, allCards: cards,
  heldCardIds: [], programs, transferRates: rates,
});
check("returns recommendations for a real gap", recs.length > 0, `${recs.length} found`);
check("cheapest gap-covering card ranks first", recs[0]?.card.id === "csp", recs[0]?.card.name);
check("excludes cards with no path to the target", !recs.some((r) => r.card.id === "unrelated"));

const recsHeld = recommendCards({
  targetProgram: hyatt, gapPoints: 40000, allCards: cards,
  heldCardIds: ["csp", "csr"], programs, transferRates: rates,
});
check("never recommends a card already held", recsHeld.length === 0);

const recsNoGap = recommendCards({
  targetProgram: hyatt, gapPoints: 0, allCards: cards,
  heldCardIds: [], programs, transferRates: rates,
});
check("no recommendations without a gap", recsNoGap.length === 0);

// --- 2. Expiry ---------------------------------------------------------------
console.log("\n=== Expiry monitoring ===");
check("parses months", inactivityMonths("24 months of inactivity") === 24);
check("parses years", inactivityMonths("3 years from earning") === 36);
check("treats non-expiring as null", inactivityMonths("Points don't expire") === null);

const now = new Date("2026-07-29T00:00:00Z");
const risks = assessExpiryRisk([
  { programName: "World of Hyatt", balance: 50000, lastActivityAt: "2024-09-01", expirationPolicy: "24 months of inactivity" },
  { programName: "Chase Ultimate Rewards", balance: 200000, lastActivityAt: "2024-01-01", expirationPolicy: "Points don't expire while account is open" },
  { programName: "Alaska Airlines Atmos Rewards", balance: 30000, lastActivityAt: null, expirationPolicy: "24 months of inactivity" },
], now);
check("flags the expiring hotel balance", risks.some((r) => r.programName === "World of Hyatt"));
check("ignores non-expiring bank points", !risks.some((r) => r.programName.includes("Chase")));
check("never guesses without an activity date", !risks.some((r) => r.programName.includes("Alaska")));
const hyattRisk = risks.find((r) => r.programName === "World of Hyatt")!;
check("severity escalates near the deadline", hyattRisk.severity === "critical",
  `${hyattRisk.daysRemaining} days -> ${hyattRisk.severity}`);

// --- 3. Alerts --------------------------------------------------------------
console.log("\n=== Alerts ===");
const bal = (p: string, b: number, activity: string | null = null) =>
  ({ id: `b-${p}`, user_id: "u", program_id: p, balance: b, last_updated: "", last_activity_at: activity }) as any;

const livePromo = edge("chase", "hyatt", {
  bonus_multiplier: 1.3, promo_starts_at: "2026-07-01", promo_ends_at: "2026-08-31", promo_name: "30% bonus",
});
const expiredPromo = edge("chase", "alaska", {
  bonus_multiplier: 1.5, promo_starts_at: "2026-01-01", promo_ends_at: "2026-02-28",
});
const undatedPromo = edge("chase", "alaska", { bonus_multiplier: 2.0 });

const bonusAlerts = buildTransferBonusAlerts(
  [bal("chase", 100000)], programs, [livePromo, expiredPromo, undatedPromo], now
);
check("alerts on a live, dated promo", bonusAlerts.length === 1, bonusAlerts[0]?.title);
check("ignores expired promos", !bonusAlerts.some((a) => a.title.includes("Alaska")));
check("sizes the alert to the user's balance",
  bonusAlerts[0]?.body.includes("130,000"), bonusAlerts[0]?.body.slice(0, 60));

const noHoldAlerts = buildTransferBonusAlerts([bal("hyatt", 50000)], programs, [livePromo], now);
check("no alert for a currency the user doesn't hold", noHoldAlerts.length === 0);

const expiryAlerts = buildExpiryAlerts(
  [bal("hyatt", 50000, "2024-09-01")], programs, now
);
check("builds expiry alerts", expiryAlerts.length === 1);
check("expiry alerts are deduped by key", expiryAlerts[0].dedupeKey.startsWith("expiry:"));

const digest = renderDigest([...bonusAlerts, ...expiryAlerts], "Sam");
check("digest renders both alert types", digest.includes("Sam") && digest.includes("at risk"));
check("digest carries the confirm-before-transfer caution", digest.includes("Confirm availability"));

// --- 4. Experiences ---------------------------------------------------------
console.log("\n=== Experiences ===");
const rows = [
  { id: "1", name: "Fixed listing", category: "dining", city: "Tokyo", city_code: "TYO",
    country: "Japan", program_name: "World of Hyatt", channel: "Hyatt FIND",
    points_required: 25000, cash_price_usd: 450, fixed_cpp: null, booking_url: null,
    notes: null, is_active: true, verified_at: "2026-07-01", created_at: "" } as any,
  { id: "2", name: "Channel rate", category: "access", city: null, city_code: null,
    country: null, program_name: "Amex Membership Rewards", channel: "Amex Experiences",
    points_required: null, cash_price_usd: null, fixed_cpp: 1.0, booking_url: null,
    notes: null, is_active: true, verified_at: "2026-07-01", created_at: "" } as any,
  { id: "3", name: "Inactive", category: "event", city: null, city_code: null, country: null,
    program_name: "Chase Ultimate Rewards", channel: "Chase Experiences",
    points_required: 1000, cash_price_usd: 100, fixed_cpp: null, booking_url: null,
    notes: null, is_active: false, verified_at: null, created_at: "" } as any,
];
const opts = toExperienceOptions(rows, 400);
check("normalizes both row shapes", opts.length === 2);
check("skips inactive rows", !opts.some((o) => o.name === "Inactive"));
const listing = opts.find((o) => o.name === "Fixed listing")!;
check("computes cpp for fixed listings", Math.abs(listing.cpp - 1.8) < 0.01, `${listing.cpp.toFixed(2)}¢`);
const channel = opts.find((o) => o.name === "Channel rate")!;
check("scales channel points to budget", channel.pointsRequired === 40000, `${channel.pointsRequired} pts for $400`);

const poorVerdict = experienceVerdict(channel, 1.0);
check("calls out redemptions at/below the cash-out floor", poorVerdict.tone === "poor", poorVerdict.text.slice(0, 70));
const goodVerdict = experienceVerdict(listing, 1.0);
check("recognizes a strong experience redemption", goodVerdict.tone === "good");

console.log(
  failures === 0
    ? "\nALL FEATURE CHECKS PASSED"
    : `\n${failures} CHECK(S) FAILED`
);
if (failures > 0) process.exit(1);
