/**
 * STAY ENHANCEMENTS — the "how do I get more than just the room" layer.
 *
 * Award pricing is only half of a hotel redemption. The other half is the
 * structural benefits that change what you actually pay or receive:
 * free-night rules, elite perks, and issuer booking programs. These are
 * deterministic rules, not availability data, so we can apply them with
 * confidence and no API.
 *
 * Every rule states its condition plainly and links to the program terms —
 * we surface the opportunity, the user confirms eligibility. Rules that
 * depend on unknown facts (e.g. whether the user holds status) are phrased
 * conditionally rather than asserted.
 */

export interface StayEnhancement {
  title: string;
  detail: string;
  /** "savings" changes what you pay; "upgrade" changes what you get. */
  kind: "savings" | "upgrade";
  /** Estimated points saved, when the rule is a points discount. */
  pointsSaved?: number;
  /** Estimated USD value, when the rule is a credit/benefit. */
  valueUsd?: number;
  learnMoreUrl?: string;
}

interface EnhancementContext {
  programName: string;
  nights: number;
  /** Total award points for the stay as priced. */
  pointsRequired: number;
  /** Cash price of the stay, for percentage-based benefit estimates. */
  cashPriceUsd: number;
  /** Programs the user holds points in — used to spot issuer booking programs. */
  heldProgramNames: string[];
}

/**
 * Fifth-night-free style rules. Marriott and Hilton both discount long award
 * stays; the math is "you pay for N-1 of every N nights."
 */
function freeNightRule(ctx: EnhancementContext): StayEnhancement | null {
  const rules: Record<string, { every: number; label: string; url: string }> = {
    "Marriott Bonvoy": {
      every: 5,
      label: "Marriott gives the 5th award night free on stays of 5+ nights",
      url: "https://www.marriott.com/loyalty/member-benefits.mi",
    },
    "Hilton Honors": {
      every: 5,
      label: "Hilton gives the 5th standard award night free (Gold status and above)",
      url: "https://www.hilton.com/en/hilton-honors/member-benefits/",
    },
  };
  const rule = rules[ctx.programName];
  if (!rule || ctx.nights < rule.every) return null;

  const freeNights = Math.floor(ctx.nights / rule.every);
  const perNight = ctx.pointsRequired / ctx.nights;
  const pointsSaved = Math.round(perNight * freeNights);

  return {
    title: `${freeNights} free award night${freeNights === 1 ? "" : "s"} on this stay`,
    detail: `${rule.label}. On ${ctx.nights} nights that's ${freeNights} night${freeNights === 1 ? "" : "s"} you don't pay points for — roughly ${pointsSaved.toLocaleString()} points. Book the stay as ONE reservation; splitting it forfeits the benefit.`,
    kind: "savings",
    pointsSaved,
    learnMoreUrl: rule.url,
  };
}

/** Programs where points can buy an upgrade or a suite outright. */
function upgradeRule(ctx: EnhancementContext): StayEnhancement | null {
  if (ctx.programName === "World of Hyatt") {
    return {
      title: "Confirm a suite upgrade with points or a Club Access award",
      detail:
        "Hyatt lets you confirm a standard suite at booking for a points premium, or apply Club Access awards for lounge access. Ask the hotel directly if the suite inventory isn't showing online — Hyatt properties often release it manually.",
      kind: "upgrade",
      learnMoreUrl: "https://world.hyatt.com/content/gp/en/rewards.html",
    };
  }
  if (ctx.programName === "Marriott Bonvoy") {
    return {
      title: "Apply Suite Night Awards if you hold Platinum or above",
      detail:
        "Suite Night Awards clear at 5 days out when inventory allows, and they stack with an award booking — you keep the points price and gain the room. Attach them to the reservation as soon as it's confirmed.",
      kind: "upgrade",
      learnMoreUrl: "https://www.marriott.com/loyalty/member-benefits.mi",
    };
  }
  if (ctx.programName === "Hilton Honors") {
    return {
      title: "Diamond/Gold upgrades apply to award stays too",
      detail:
        "Hilton elite upgrades are honored on award reservations, including executive floors where the property offers them. Free breakfast or a food credit typically comes with Gold and above.",
      kind: "upgrade",
      learnMoreUrl: "https://www.hilton.com/en/hilton-honors/member-benefits/",
    };
  }
  if (ctx.programName === "IHG One Rewards") {
    return {
      title: "Fourth night free on Reward Nights for Premier cardholders",
      detail:
        "If you hold the IHG Premier card, the 4th Reward Night is free on stays of 4+ nights — worth checking before you book this as separate reservations.",
      kind: "savings",
      learnMoreUrl: "https://www.ihg.com/onerewards/content/us/en/home",
    };
  }
  return null;
}

/**
 * Issuer luxury-hotel programs. These are CASH bookings that come with real
 * benefits — and sometimes beat an award redemption outright, which is
 * exactly the comparison users can't do on their own.
 */
function issuerProgramRule(ctx: EnhancementContext): StayEnhancement | null {
  const holdsAmex = ctx.heldProgramNames.includes("Amex Membership Rewards");
  const holdsChase = ctx.heldProgramNames.includes("Chase Ultimate Rewards");
  const holdsCapOne = ctx.heldProgramNames.includes("Capital One Miles");

  if (holdsAmex) {
    return {
      title: "Compare Amex Fine Hotels + Resorts before redeeming points",
      detail:
        "If you hold a Platinum card, FHR bookings are paid in cash but include a property credit (often $100), breakfast for two, a 4pm checkout, and a space-available upgrade. On expensive properties those extras can exceed the value of the points you'd spend — worth pricing both ways.",
      kind: "upgrade",
      valueUsd: Math.min(200, Math.round(ctx.cashPriceUsd * 0.15)),
      learnMoreUrl:
        "https://www.americanexpress.com/en-us/travel/discover/fine-hotels-resorts/",
    };
  }
  if (holdsChase) {
    return {
      title: "Compare The Edit by Chase Travel for this stay",
      detail:
        "Chase's luxury hotel collection pairs cash or points bookings with a property credit and breakfast on qualifying stays. Because it's bookable with points at the portal rate, it's a direct apples-to-apples comparison against this award.",
      kind: "upgrade",
      valueUsd: Math.min(150, Math.round(ctx.cashPriceUsd * 0.12)),
      learnMoreUrl: "https://www.chase.com/travel",
    };
  }
  if (holdsCapOne) {
    return {
      title: "Check Capital One Premier Collection",
      detail:
        "Premier Collection bookings include a property credit and daily breakfast, and Venture X earns a high multiplier on portal bookings. Compare the all-in cost against this award before transferring.",
      kind: "upgrade",
      valueUsd: Math.min(150, Math.round(ctx.cashPriceUsd * 0.12)),
      learnMoreUrl: "https://www.capitalone.com/travel",
    };
  }
  return null;
}

/** Award-stay universals worth stating once. */
function universalRules(ctx: EnhancementContext): StayEnhancement[] {
  const out: StayEnhancement[] = [];
  out.push({
    title: "Award nights usually skip room tax",
    detail:
      "Most programs charge no room tax on points stays, which is why the cash comparison here includes tax. Resort and parking fees are still charged at many properties — check the property page before you assume the total.",
    kind: "savings",
  });
  if (ctx.nights >= 3) {
    out.push({
      title: "Ask about a mid-stay rate check",
      detail:
        "On stays of 3+ nights, award pricing can drop after you book at dynamically-priced programs. Re-pricing a cancellable award reservation and rebooking at the lower rate refunds the difference in points.",
      kind: "savings",
    });
  }
  return out;
}

export function getStayEnhancements(ctx: EnhancementContext): StayEnhancement[] {
  return [
    freeNightRule(ctx),
    upgradeRule(ctx),
    issuerProgramRule(ctx),
    ...universalRules(ctx),
  ].filter((x): x is StayEnhancement => x !== null);
}
