import { Database } from "@/lib/database.types";
import {
  AwardOption,
  PaymentPath,
  TravelQuery,
  buildOptimizationPlaybook,
} from "./engine";

type PointsBalance = Database["public"]["Tables"]["points_balances"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type TransferRate = Database["public"]["Tables"]["transfer_rates"]["Row"];

/**
 * TRIP ALLOCATOR — the feature no competitor ships.
 *
 * A single playbook answers "how do I book this flight?" A real trip is a
 * flight AND a hotel AND maybe an experience, funded from ONE pool of points.
 * Optimize each leg independently and you double-count the same 200k Chase
 * points three times, handing the user a plan they cannot execute.
 *
 * This allocator solves the whole trip:
 *   1. Order legs by "scarcity" — the leg with the fewest viable funding
 *      options goes first, because a flexible leg can absorb what's left but
 *      a constrained leg can't. (Classic most-constrained-first heuristic;
 *      much better in practice than largest-first for this problem.)
 *   2. Solve each leg against the REMAINING balance pool.
 *   3. Debit whatever that leg actually consumed before solving the next.
 *   4. Report leftovers, per-leg value, and any leg we couldn't fund — with
 *      the reason, and the shortfall in the user's own currencies.
 *
 * Honesty rule: a leg that can't be funded is reported as unfunded with a
 * cash fallback, never silently dropped or funded with points already spent.
 */

export interface TripLegInput {
  /** Stable id supplied by the caller, used to match results back. */
  id: string;
  label: string;
  query: TravelQuery;
  awardOptions: AwardOption[];
  /** Cash price for the whole leg if paid outright (used for the fallback
   *  narrative when points can't cover it). */
  cashPriceUsd: number;
  /** If true, this leg is skipped when it can't be funded rather than
   *  reported as a blocker (e.g. optional experiences). */
  optional?: boolean;
}

export interface AllocatedLeg {
  id: string;
  label: string;
  funded: boolean;
  /** The chosen path for this leg (best available given remaining points). */
  path?: PaymentPath;
  /** Runner-up paths for this leg, in case the user wants to swap. */
  alternatives: PaymentPath[];
  /** Why we couldn't fund it, when funded === false. */
  reason?: string;
  /** Cash to pay instead, when unfunded. */
  cashFallbackUsd?: number;
  optional: boolean;
}

export interface TripPlan {
  legs: AllocatedLeg[];
  totalPointsSpent: number;
  totalCashSpent: number;
  /** Cash value of everything funded with points. */
  totalCashAvoided: number;
  /** Blended cents-per-point across the whole trip. */
  blendedCpp: number;
  /** What's left in each program after the trip, only non-zero entries. */
  leftovers: Array<{ programName: string; balance: number }>;
  /** Legs we could not fund (excluding optional ones). */
  blockers: Array<{ label: string; reason: string; cashFallbackUsd: number }>;
  /** Plain-language summary of the order of operations. */
  narrative: string[];
  warnings: string[];
}

/** Deep-copy balances so allocation never mutates the caller's rows. */
function cloneBalances(balances: PointsBalance[]): PointsBalance[] {
  return balances.map((b) => ({ ...b }));
}

/**
 * FUNDING BREADTH — how many of the user's currencies could pay for this leg.
 *
 * Counting engine paths looked like the obvious scarcity metric and is a trap:
 * the engine stops generating split-source plans once a single program covers
 * the leg, so a leg fundable from Chase OR Amex reports the same count as one
 * fundable only from Chase. That mis-ordered legs and stranded the constrained
 * one (caught by scripts/trip-allocator-test.ts).
 *
 * Breadth instead walks the transfer graph backwards from each award program
 * and counts the DISTINCT held currencies that can reach it, ignoring whether
 * any single one has enough — flexibility, not affordability. Plus one for a
 * portal fallback when the user holds any bank currency with a portal.
 */
function fundingBreadth(
  leg: TripLegInput,
  balances: PointsBalance[],
  programs: LoyaltyProgram[],
  rates: TransferRate[],
  maxHops = 2
): number {
  const held = new Set(
    balances.filter((b) => b.balance > 0).map((b) => b.program_id)
  );
  if (held.size === 0) return 0;

  const incoming = new Map<string, TransferRate[]>();
  for (const rate of rates) {
    const list = incoming.get(rate.to_program_id) ?? [];
    list.push(rate);
    incoming.set(rate.to_program_id, list);
  }

  const sources = new Set<string>();
  for (const award of leg.awardOptions) {
    // Held balance directly in the award program counts.
    if (held.has(award.program.id)) sources.add(award.program.id);

    // Walk backwards up to maxHops collecting held source currencies.
    let frontier = [award.program.id];
    const seen = new Set<string>(frontier);
    for (let hop = 0; hop < maxHops; hop++) {
      const next: string[] = [];
      for (const node of frontier) {
        for (const rate of incoming.get(node) ?? []) {
          if (seen.has(rate.from_program_id)) continue;
          seen.add(rate.from_program_id);
          next.push(rate.from_program_id);
          if (held.has(rate.from_program_id)) sources.add(rate.from_program_id);
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
  }

  // Portal fallback: any held bank currency can book a cash-priced leg.
  const hasPortalSource = programs.some(
    (p) => p.type === "bank" && held.has(p.id)
  );
  return sources.size + (hasPortalSource ? 1 : 0);
}

/** Points the leg needs at its cheapest award, for tie-breaking. */
function legWeight(leg: TripLegInput): number {
  if (leg.awardOptions.length === 0) return 0;
  return Math.min(...leg.awardOptions.map((a) => a.milesRequired));
}

function debit(
  balances: PointsBalance[],
  programs: LoyaltyProgram[],
  path: PaymentPath
): void {
  const idByName = new Map(programs.map((p) => [p.name, p.id]));
  for (const entry of path.pointsBreakdown) {
    const programId = idByName.get(entry.programName);
    if (!programId) continue;
    const row = balances.find((b) => b.program_id === programId);
    if (!row) continue;
    row.balance = Math.max(0, row.balance - entry.amount);
  }
}

export function allocateTrip(
  tripLegs: TripLegInput[],
  userBalances: PointsBalance[],
  programs: LoyaltyProgram[],
  transferRates: TransferRate[]
): TripPlan {
  const pool = cloneBalances(userBalances);
  const programById = new Map(programs.map((p) => [p.id, p]));

  // --- 1. Order by scarcity (narrowest funding breadth first) -------------
  const ordered = [...tripLegs]
    .map((leg) => ({
      leg,
      breadth: fundingBreadth(leg, pool, programs, transferRates),
      weight: legWeight(leg),
    }))
    .sort((a, b) => {
      // Legs with no award options at all go last — they can't consume points.
      const aDead = a.leg.awardOptions.length === 0;
      const bDead = b.leg.awardOptions.length === 0;
      if (aDead !== bDead) return aDead ? 1 : -1;
      // Required legs before optional ones.
      if (!!a.leg.optional !== !!b.leg.optional) return a.leg.optional ? 1 : -1;
      // Narrowest breadth first — a flexible leg can absorb what's left.
      if (a.breadth !== b.breadth) return a.breadth - b.breadth;
      // Equal flexibility: fund the expensive leg first, it fits worse later.
      return b.weight - a.weight;
    })
    .map((x) => x.leg);

  // --- 2/3. Solve each leg against what's left, debiting as we go ---------
  const results: AllocatedLeg[] = [];
  const narrative: string[] = [];
  const warnings: string[] = [];
  let stepNo = 1;

  for (const leg of ordered) {
    const playbook = buildOptimizationPlaybook(
      pool,
      programs,
      transferRates,
      leg.query,
      leg.awardOptions,
      { maxAlternatives: 4 }
    );

    if (!playbook) {
      const reason =
        leg.awardOptions.length === 0
          ? "No award availability found for this leg."
          : "Not enough points left in reachable programs after funding the earlier legs.";
      results.push({
        id: leg.id,
        label: leg.label,
        funded: false,
        alternatives: [],
        reason,
        cashFallbackUsd: leg.cashPriceUsd,
        optional: !!leg.optional,
      });
      if (!leg.optional) {
        narrative.push(
          `${leg.label}: pay cash (~$${Math.round(leg.cashPriceUsd).toLocaleString()}). ${reason}`
        );
      }
      continue;
    }

    debit(pool, programs, playbook.best);
    results.push({
      id: leg.id,
      label: leg.label,
      funded: true,
      path: playbook.best,
      alternatives: playbook.alternatives,
      optional: !!leg.optional,
    });
    warnings.push(...playbook.best.warnings);

    narrative.push(
      `Step ${stepNo++} — ${leg.label}: ${playbook.best.name} (${playbook.best.totalPoints.toLocaleString()} pts` +
        (playbook.best.totalCash > 0
          ? ` + $${Math.round(playbook.best.totalCash).toLocaleString()}`
          : "") +
        `).`
    );
  }

  // --- 4. Totals and leftovers -------------------------------------------
  const funded = results.filter((r) => r.funded && r.path);
  const totalPointsSpent = funded.reduce((s, r) => s + r.path!.totalPoints, 0);
  const totalCashSpent = funded.reduce((s, r) => s + r.path!.totalCash, 0);
  const totalCashAvoided = funded.reduce((s, r) => s + r.path!.cashAvoided, 0);
  const blendedCpp =
    totalPointsSpent > 0 ? (totalCashAvoided / totalPointsSpent) * 100 : 0;

  const leftovers = pool
    .filter((b) => b.balance > 0)
    .map((b) => ({
      programName: programById.get(b.program_id)?.name ?? "Unknown program",
      balance: b.balance,
    }))
    .sort((a, b) => b.balance - a.balance);

  const blockers = results
    .filter((r) => !r.funded && !r.optional)
    .map((r) => ({
      label: r.label,
      reason: r.reason ?? "Could not fund with points.",
      cashFallbackUsd: r.cashFallbackUsd ?? 0,
    }));

  if (funded.length > 1) {
    narrative.push(
      `Do the transfers in this order — each leg's transfer is sized from what's left after the previous one, so transferring out of order can strand points in a program you no longer need.`
    );
  }

  // Restore the caller's original leg order for display.
  const displayOrder = tripLegs.map(
    (leg) => results.find((r) => r.id === leg.id)!
  );

  return {
    legs: displayOrder,
    totalPointsSpent,
    totalCashSpent,
    totalCashAvoided,
    blendedCpp,
    leftovers,
    blockers,
    narrative,
    warnings: [...new Set(warnings)],
  };
}
