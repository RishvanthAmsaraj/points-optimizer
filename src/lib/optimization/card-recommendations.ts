import { Database } from "@/lib/database.types";

type Card = Database["public"]["Tables"]["cards"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type TransferRate = Database["public"]["Tables"]["transfer_rates"]["Row"];

/**
 * CARD RECOMMENDATIONS — gap analysis, not advertising.
 *
 * Triggered by a concrete shortfall: "this redemption needs 40,000 more
 * points in a program you can reach." We then look for cards whose currency
 * reaches that program and whose signup bonus would close the gap.
 *
 * Deliberate constraints, because recommendation integrity is the product:
 *   - Only recommend when there IS a real gap. No unsolicited card pushing.
 *   - Never recommend a card the user already holds.
 *   - Always surface the annual fee and the spend requirement alongside the
 *     bonus, so the cost is as visible as the upside.
 *   - Rank by how well the bonus fits the gap, not by payout to us. If this
 *     ever becomes affiliate-monetized, that ranking rule must not change,
 *     and the disclosure belongs on the same screen.
 */

export interface CardRecommendation {
  card: Card;
  /** Program the card's points reach that closes the gap. */
  targetProgramName: string;
  /** Points still needed before the bonus. */
  gapPoints: number;
  /** Does the signup bonus alone cover the gap? */
  coversGap: boolean;
  /** Spend needed to earn the bonus. */
  spendRequired: number;
  annualFee: number;
  reason: string;
}

/** Programs reachable from a source currency within maxHops. */
function reachableFrom(
  sourceProgramId: string,
  rates: TransferRate[],
  maxHops = 2
): Set<string> {
  const outgoing = new Map<string, TransferRate[]>();
  for (const rate of rates) {
    const list = outgoing.get(rate.from_program_id) ?? [];
    list.push(rate);
    outgoing.set(rate.from_program_id, list);
  }
  const seen = new Set<string>([sourceProgramId]);
  let frontier = [sourceProgramId];
  for (let hop = 0; hop < maxHops; hop++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const rate of outgoing.get(node) ?? []) {
        if (seen.has(rate.to_program_id)) continue;
        seen.add(rate.to_program_id);
        next.push(rate.to_program_id);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return seen;
}

export function recommendCards(params: {
  /** Program the user needs points in. */
  targetProgram: LoyaltyProgram;
  /** How many more points they need there. */
  gapPoints: number;
  allCards: Card[];
  heldCardIds: string[];
  programs: LoyaltyProgram[];
  transferRates: TransferRate[];
  limit?: number;
}): CardRecommendation[] {
  const {
    targetProgram,
    gapPoints,
    allCards,
    heldCardIds,
    programs,
    transferRates,
    limit = 3,
  } = params;

  if (gapPoints <= 0) return [];

  const held = new Set(heldCardIds);
  const programByName = new Map(programs.map((p) => [p.name, p]));
  const out: CardRecommendation[] = [];

  for (const card of allCards) {
    if (held.has(card.id) || !card.is_active) continue;

    const currencies = (card.transfer_partners ?? []) as string[];
    for (const currencyName of currencies) {
      const currency = programByName.get(currencyName);
      if (!currency) continue;

      const reaches = reachableFrom(currency.id, transferRates);
      if (!reaches.has(targetProgram.id)) continue;

      const bonus = card.signup_bonus_points ?? 0;
      if (bonus <= 0) continue;

      const coversGap = bonus >= gapPoints;
      out.push({
        card,
        targetProgramName: targetProgram.name,
        gapPoints,
        coversGap,
        spendRequired: card.signup_bonus_spend_required ?? 0,
        annualFee: card.annual_fee ?? 0,
        reason: coversGap
          ? `Its ${bonus.toLocaleString()}-point bonus covers the ${gapPoints.toLocaleString()} you're short, and ${currencyName} transfers to ${targetProgram.name}.`
          : `Its ${bonus.toLocaleString()}-point bonus closes most of the ${gapPoints.toLocaleString()}-point gap via ${currencyName}.`,
      });
      break; // one recommendation per card
    }
  }

  return out
    .sort((a, b) => {
      // Cards that fully close the gap first.
      if (a.coversGap !== b.coversGap) return a.coversGap ? -1 : 1;
      // Then cheapest to hold.
      if (a.annualFee !== b.annualFee) return a.annualFee - b.annualFee;
      // Then lowest spend requirement.
      return a.spendRequired - b.spendRequired;
    })
    .slice(0, limit);
}

/** Standing FTC-style disclosure to render wherever recommendations appear. */
export const RECOMMENDATION_DISCLOSURE =
  "We suggest cards only when your plan is short of points, ranked by how well the bonus fits your gap and what it costs to hold — never by any commission. Approval odds, bonuses, and fees are set by the issuer and change often; confirm current terms on the issuer's site before applying.";
