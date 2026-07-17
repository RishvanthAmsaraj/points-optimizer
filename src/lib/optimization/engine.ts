import { Database } from "@/lib/database.types";
import {
  PORTAL_CONFIG,
  SCORE_WEIGHTS,
  TIMING_SPEED_SCORE,
  getBookingUrl,
  getTransferUrl,
} from "./config";

type PointsBalance = Database["public"]["Tables"]["points_balances"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type TransferRate = Database["public"]["Tables"]["transfer_rates"]["Row"];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TravelQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  passengers: number;
}

/** One bookable award, already resolved to a loyalty_programs row. */
export interface AwardOption {
  program: LoyaltyProgram;
  /** Miles required PER PASSENGER. */
  milesRequired: number;
  /** Taxes/fees in USD PER PASSENGER. */
  taxesAndFees: number;
  /** Comparable cash price in USD PER PASSENGER (0 if unknown). */
  cashPrice: number;
  airline: string;
  routing: string[];
  stops: number;
  durationMinutes: number;
  source: string;
}

export type StepType = "use_balance" | "transfer" | "book" | "portal";

export interface PathStep {
  type: StepType;
  description: string;
  details: Record<string, unknown>;
}

export interface PointsBreakdown {
  programName: string;
  amount: number;
}

export interface PaymentPath {
  id: string;
  name: string;
  steps: PathStep[];
  /** Total points spent across all source currencies. */
  totalPoints: number;
  pointsBreakdown: PointsBreakdown[];
  /** Out-of-pocket cash (taxes & fees) in USD. */
  totalCash: number;
  /** Cents of value captured per point spent. 0 when cash price unknown. */
  cpp: number;
  /** Cash you avoid spending vs. paying the fare outright, in USD. */
  cashAvoided: number;
  /** Number of distinct actions the user must take. */
  complexity: number;
  /** 0..1 — 1 is instant end-to-end. */
  speedScore: number;
  warnings: string[];
  score: number;
}

export interface PlaybookResult {
  best: PaymentPath;
  alternatives: PaymentPath[];
  consideredCount: number;
  query: TravelQuery;
  meta: {
    provider: string;
    generatedAt: string;
    disclaimer: string;
  };
}

interface EngineOptions {
  /** Max transfer hops in a chain. 2 covers every realistic pattern
   *  (bank -> airline, bank -> hotel -> airline). */
  maxHops?: number;
  maxAlternatives?: number;
  providerName?: string;
}

// ---------------------------------------------------------------------------
// Transfer math
// ---------------------------------------------------------------------------

/** Destination points yielded by transferring `sourceAmount` along an edge. */
function transferYield(rate: TransferRate, sourceAmount: number): number {
  const base = Math.floor(sourceAmount * Number(rate.ratio) * Number(rate.bonus_multiplier));
  const blocks =
    rate.block_size > 0 ? Math.floor(sourceAmount / rate.block_size) * rate.block_bonus : 0;
  return base + blocks;
}

/**
 * Minimum source points to transfer so the destination receives >= `needed`,
 * respecting the edge's increment and minimum. Returns null if impossible
 * within a sane bound.
 */
function sourcePointsNeeded(rate: TransferRate, needed: number): number | null {
  if (needed <= 0) return 0;
  const effRatio = Number(rate.ratio) * Number(rate.bonus_multiplier);
  if (effRatio <= 0) return null;

  const increment = Math.max(rate.increment || 1000, 1);
  // Optimistic estimate ignoring block bonuses, then adjust.
  let x = Math.ceil(needed / effRatio);
  x = Math.ceil(x / increment) * increment;
  x = Math.max(x, rate.minimum_transfer || 0);

  let guard = 0;
  // Step down while a smaller increment still satisfies (block bonuses can
  // make the estimate overshoot)...
  while (
    x - increment >= (rate.minimum_transfer || 0) &&
    transferYield(rate, x - increment) >= needed &&
    guard++ < 10_000
  ) {
    x -= increment;
  }
  // ...or step up if the estimate undershoots.
  while (transferYield(rate, x) < needed && guard++ < 10_000) {
    x += increment;
  }
  return guard < 10_000 ? x : null;
}

// ---------------------------------------------------------------------------
// Funding plans: how to get `amount` miles into `targetProgram`
// ---------------------------------------------------------------------------

interface ChainHop {
  rate: TransferRate;
  from: LoyaltyProgram;
  to: LoyaltyProgram;
  /** Points leaving `from` on this hop. */
  sourceAmount: number;
  /** Points arriving in `to` on this hop. */
  arriving: number;
}

interface FundingPlan {
  kind: "balance" | "single_source" | "split_source";
  /** Existing miles used directly from the target program's balance. */
  balanceUsed: number;
  chains: ChainHop[][];
}

function buildIncomingEdgeIndex(rates: TransferRate[]): Map<string, TransferRate[]> {
  const index = new Map<string, TransferRate[]>();
  for (const rate of rates) {
    const list = index.get(rate.to_program_id) ?? [];
    list.push(rate);
    index.set(rate.to_program_id, list);
  }
  return index;
}

function findFundingPlans(
  target: LoyaltyProgram,
  amountNeeded: number,
  balances: PointsBalance[],
  programs: Map<string, LoyaltyProgram>,
  incomingEdges: Map<string, TransferRate[]>,
  maxHops: number
): FundingPlan[] {
  const plans: FundingPlan[] = [];
  const balanceOf = (programId: string) =>
    balances.find((b) => b.program_id === programId)?.balance ?? 0;

  const targetBalance = balanceOf(target.id);

  // Plan 0: existing balance fully covers.
  if (targetBalance >= amountNeeded) {
    plans.push({ kind: "balance", balanceUsed: amountNeeded, chains: [] });
  }

  // Remaining need after using whatever already sits in the target program.
  const balanceUsed = Math.min(targetBalance, amountNeeded);
  const remaining = amountNeeded - balanceUsed;
  if (remaining <= 0) return plans;

  // Single-source chains: DFS backwards from the target, up to maxHops.
  const chains: ChainHop[][] = [];
  const walk = (
    node: LoyaltyProgram,
    needed: number,
    path: ChainHop[],
    visited: Set<string>
  ) => {
    if (path.length >= maxHops) return;
    for (const rate of incomingEdges.get(node.id) ?? []) {
      const from = programs.get(rate.from_program_id);
      if (!from || visited.has(from.id)) continue;

      const sourceAmount = sourcePointsNeeded(rate, needed);
      if (sourceAmount === null) continue;

      const hop: ChainHop = {
        rate,
        from,
        to: node,
        sourceAmount,
        arriving: transferYield(rate, sourceAmount),
      };
      const chain = [hop, ...path];

      if (balanceOf(from.id) >= sourceAmount) {
        chains.push(chain);
      }
      // Keep walking back even if this source can't cover — a program further
      // upstream might (e.g. Chase -> Marriott -> Alaska when the user only
      // holds Chase).
      walk(from, sourceAmount, chain, new Set([...visited, from.id]));
    }
  };
  walk(target, remaining, [], new Set([target.id]));

  for (const chain of chains) {
    plans.push({ kind: "single_source", balanceUsed, chains: [chain] });
  }

  // Split-source fallback: no single program covers, so combine several
  // 1-hop transfers into the target (miles must land in ONE account to book,
  // which is why all splits converge on the target program).
  if (chains.length === 0) {
    const directEdges = (incomingEdges.get(target.id) ?? [])
      .map((rate) => ({ rate, from: programs.get(rate.from_program_id) }))
      .filter((e): e is { rate: TransferRate; from: LoyaltyProgram } => !!e.from)
      .filter((e) => balanceOf(e.from.id) >= (e.rate.minimum_transfer || 0))
      // Drain best-value sources first (highest effective ratio loses least).
      .sort(
        (a, b) =>
          Number(b.rate.ratio) * Number(b.rate.bonus_multiplier) -
          Number(a.rate.ratio) * Number(a.rate.bonus_multiplier)
      );

    let still = remaining;
    const splitChains: ChainHop[][] = [];
    for (const { rate, from } of directEdges) {
      if (still <= 0) break;
      const available = balanceOf(from.id);
      const wanted = sourcePointsNeeded(rate, still);
      if (wanted === null) continue;
      const sourceAmount = Math.min(wanted, Math.floor(available / (rate.increment || 1000)) * (rate.increment || 1000));
      if (sourceAmount < (rate.minimum_transfer || 0) || sourceAmount <= 0) continue;
      const arriving = transferYield(rate, sourceAmount);
      splitChains.push([{ rate, from, to: target, sourceAmount, arriving }]);
      still -= arriving;
    }
    if (still <= 0 && splitChains.length > 1) {
      plans.push({ kind: "split_source", balanceUsed, chains: splitChains });
    }
  }

  return plans;
}

// ---------------------------------------------------------------------------
// Plan -> PaymentPath
// ---------------------------------------------------------------------------

function speedForTiming(timing: string | null): number {
  if (!timing) return 0.5;
  const key = timing.toLowerCase();
  for (const [needle, score] of TIMING_SPEED_SCORE) {
    if (key.includes(needle)) return score;
  }
  return 0.5;
}

function planToPath(
  plan: FundingPlan,
  award: AwardOption,
  query: TravelQuery
): PaymentPath {
  const pax = query.passengers;
  const milesNeeded = award.milesRequired * pax;
  const totalFees = award.taxesAndFees * pax;
  const totalCashPrice = award.cashPrice * pax;

  const steps: PathStep[] = [];
  const breakdown = new Map<string, number>();
  const warnings: string[] = [];
  let slowest = 1;

  if (plan.balanceUsed > 0) {
    steps.push({
      type: "use_balance",
      description: `Use ${plan.balanceUsed.toLocaleString()} miles already in your ${award.program.name} account`,
      details: { program: award.program.name, amount: plan.balanceUsed },
    });
    breakdown.set(
      award.program.name,
      (breakdown.get(award.program.name) ?? 0) + plan.balanceUsed
    );
  }

  for (const chain of plan.chains) {
    for (const hop of chain) {
      steps.push({
        type: "transfer",
        description: `Transfer ${hop.sourceAmount.toLocaleString()} ${hop.from.name} points to ${hop.to.name}`,
        details: {
          fromProgram: hop.from.name,
          toProgram: hop.to.name,
          pointsToTransfer: hop.sourceAmount,
          pointsArriving: hop.arriving,
          ratio: Number(hop.rate.ratio),
          bonusMultiplier: Number(hop.rate.bonus_multiplier),
          blockBonus:
            hop.rate.block_size > 0
              ? `${hop.rate.block_bonus.toLocaleString()} bonus per ${hop.rate.block_size.toLocaleString()} transferred`
              : null,
          timing: hop.rate.typical_timing,
          reversible: hop.rate.is_reversible,
          transferUrl: getTransferUrl(hop.from.name),
        },
      });
      slowest = Math.min(slowest, speedForTiming(hop.rate.typical_timing));
      if (!hop.rate.is_reversible) {
        warnings.push(
          `Transfers from ${hop.from.name} to ${hop.to.name} cannot be reversed — confirm the award space is bookable before transferring.`
        );
      }
      const effRatio = Number(hop.rate.ratio) * Number(hop.rate.bonus_multiplier);
      if (effRatio < 0.9) {
        warnings.push(
          `The ${hop.from.name} → ${hop.to.name} hop converts at roughly ${effRatio.toFixed(2)}:1 — you lose points on this step, so only do it if the redemption still comes out ahead.`
        );
      }
    }
    const first = chain[0];
    breakdown.set(
      first.from.name,
      (breakdown.get(first.from.name) ?? 0) + first.sourceAmount
    );
  }

  steps.push({
    type: "book",
    description: `Book the ${award.airline} award (${award.routing.join(" → ")}) through ${award.program.name}`,
    details: {
      program: award.program.name,
      milesRequired: milesNeeded,
      taxesAndFees: totalFees,
      passengers: pax,
      bookingUrl: getBookingUrl(award.program.name),
      flight: {
        airline: award.airline,
        routing: award.routing,
        stops: award.stops,
        durationMinutes: award.durationMinutes,
        cabin: query.cabin,
      },
    },
  });

  const totalPoints = [...breakdown.values()].reduce((a, b) => a + b, 0);
  const cpp =
    totalCashPrice > 0 && totalPoints > 0
      ? ((totalCashPrice - totalFees) / totalPoints) * 100
      : 0;

  const chainLabel =
    plan.kind === "balance"
      ? award.program.name
      : plan.kind === "split_source"
        ? `${plan.chains.map((c) => c[0].from.name).join(" + ")} → ${award.program.name}`
        : [
            ...plan.chains[0].map((h) => h.from.name),
            award.program.name,
          ].join(" → ");

  return {
    id: `award-${award.program.id}-${plan.kind}-${steps.length}-${totalPoints}`,
    name: chainLabel,
    steps,
    totalPoints,
    pointsBreakdown: [...breakdown.entries()].map(([programName, amount]) => ({
      programName,
      amount,
    })),
    totalCash: totalFees,
    cpp,
    cashAvoided: totalCashPrice > 0 ? Math.max(totalCashPrice - totalFees, 0) : 0,
    complexity: steps.length,
    speedScore: slowest,
    warnings,
    score: 0,
  };
}

// ---------------------------------------------------------------------------
// Portal paths
// ---------------------------------------------------------------------------

function buildPortalPaths(
  query: TravelQuery,
  cashPricePerPax: number,
  balances: PointsBalance[],
  programs: LoyaltyProgram[]
): PaymentPath[] {
  if (cashPricePerPax <= 0) return [];
  const paths: PaymentPath[] = [];
  const totalCashPrice = cashPricePerPax * query.passengers;

  for (const program of programs.filter((p) => p.type === "bank")) {
    const portal = PORTAL_CONFIG[program.name];
    if (!portal) continue;
    const balance = balances.find((b) => b.program_id === program.id);
    if (!balance) continue;

    const pointsNeeded = Math.ceil(totalCashPrice / portal.valuePerPointUsd);
    if (balance.balance < pointsNeeded) continue;

    paths.push({
      id: `portal-${program.id}`,
      name: `${program.name} travel portal`,
      steps: [
        {
          type: "portal",
          description: `Book the cash fare through the ${program.name} portal using ${pointsNeeded.toLocaleString()} points`,
          details: {
            portalUrl: portal.url,
            pointsNeeded,
            cashPrice: totalCashPrice,
            centsPerPoint: portal.valuePerPointUsd * 100,
            note: portal.note,
          },
        },
      ],
      totalPoints: pointsNeeded,
      pointsBreakdown: [{ programName: program.name, amount: pointsNeeded }],
      totalCash: 0,
      cpp: portal.valuePerPointUsd * 100,
      cashAvoided: totalCashPrice,
      complexity: 1,
      speedScore: 1,
      warnings: [],
      score: 0,
    });
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scorePath(path: PaymentPath): number {
  const cppNorm = Math.min(path.cpp / 5, 1); // 5cpp treated as ceiling
  const simplicity = 1 / path.complexity;
  const risk = path.warnings.length > 0 ? 0 : 1;
  return (
    cppNorm * SCORE_WEIGHTS.value +
    simplicity * SCORE_WEIGHTS.simplicity +
    path.speedScore * SCORE_WEIGHTS.speed +
    risk * SCORE_WEIGHTS.risk
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildOptimizationPlaybook(
  userBalances: PointsBalance[],
  programs: LoyaltyProgram[],
  transferRates: TransferRate[],
  query: TravelQuery,
  awardOptions: AwardOption[],
  options: EngineOptions = {}
): PlaybookResult | null {
  const { maxHops = 2, maxAlternatives = 4, providerName = "unknown" } = options;

  const programById = new Map(programs.map((p) => [p.id, p]));
  const incomingEdges = buildIncomingEdgeIndex(transferRates);
  const paths: PaymentPath[] = [];

  for (const award of awardOptions) {
    const plans = findFundingPlans(
      award.program,
      award.milesRequired * query.passengers,
      userBalances,
      programById,
      incomingEdges,
      maxHops
    );
    for (const plan of plans) {
      paths.push(planToPath(plan, award, query));
    }
  }

  // Portal baseline: use the best-known cash price across award options.
  const bestCashPrice = Math.max(0, ...awardOptions.map((a) => a.cashPrice));
  paths.push(...buildPortalPaths(query, bestCashPrice, userBalances, programs));

  if (paths.length === 0) return null;

  // Score, then dedupe near-identical paths (same name + same point total).
  const seen = new Set<string>();
  const ranked = paths
    .map((p) => ({ ...p, score: scorePath(p) }))
    .sort((a, b) => b.score - a.score)
    .filter((p) => {
      const key = `${p.name}|${p.totalPoints}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    best: ranked[0],
    alternatives: ranked.slice(1, 1 + maxAlternatives),
    consideredCount: ranked.length,
    query,
    meta: {
      provider: providerName,
      generatedAt: new Date().toISOString(),
      disclaimer:
        "Award pricing, availability, and transfer rules change without notice. Verify award space with the airline before transferring points — most transfers are irreversible. This is not financial advice.",
    },
  };
}
