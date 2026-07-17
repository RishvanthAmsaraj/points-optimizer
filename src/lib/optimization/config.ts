/**
 * Tunable configuration for the optimization engine, kept separate from the
 * algorithm so rate/valuation updates don't require touching engine logic.
 *
 * DATA OPS NOTE: portal values depend on WHICH card the user holds (e.g.
 * Chase Sapphire Reserve boosts portal value vs. the Preferred). Until we
 * wire card-level portal multipliers through user_cards, we use the
 * conservative (lowest) value so we never overstate a portal redemption.
 * Verify these against issuer terms quarterly.
 */

export interface PortalConfig {
  valuePerPointUsd: number;
  url: string;
  note?: string;
}

export const PORTAL_CONFIG: Record<string, PortalConfig> = {
  "Chase Ultimate Rewards": {
    valuePerPointUsd: 0.0125,
    url: "https://www.chase.com/travel",
    note: "1.25¢ assumes Sapphire Preferred; some cards/promos differ — check your card's portal rate.",
  },
  "Amex Membership Rewards": {
    valuePerPointUsd: 0.01,
    url: "https://www.amextravel.com",
    note: "1¢ on flights via Amex Travel; other bookings redeem lower.",
  },
  "Citi ThankYou Points": {
    valuePerPointUsd: 0.01,
    url: "https://www.cititravel.com",
  },
  "Capital One Miles": {
    valuePerPointUsd: 0.01,
    url: "https://www.capitalone.com/travel",
  },
};

/** Relative importance of each factor when ranking paths. Must sum to 1. */
export const SCORE_WEIGHTS = {
  value: 0.6, // cents-per-point captured — the point of the product
  simplicity: 0.15, // fewer steps is better
  speed: 0.15, // instant transfers beat multi-day ones
  risk: 0.1, // graded down as warnings accumulate
};

/** Maps typical_timing text to a 0..1 speed score (1 = instant). */
export const TIMING_SPEED_SCORE: Array<[string, number]> = [
  ["instant", 1],
  ["same day", 0.8],
  ["24 hour", 0.6],
  ["48 hour", 0.4],
  ["week", 0.2],
  ["day", 0.45], // catches "3-5 days" etc. ("same day" matches earlier)
];

const TRANSFER_URLS: Record<string, string> = {
  "Chase Ultimate Rewards": "https://www.chase.com/ultimaterewards",
  "Amex Membership Rewards": "https://www.americanexpress.com/rewards",
  "Citi ThankYou Points": "https://www.thankyou.com",
  "Capital One Miles": "https://www.capitalone.com/rewards",
  "Marriott Bonvoy": "https://www.marriott.com/loyalty/redeem/convert-points.mi",
};

const BOOKING_URLS: Record<string, string> = {
  "United MileagePlus": "https://www.united.com",
  "American Airlines AAdvantage": "https://www.aa.com",
  "Delta SkyMiles": "https://www.delta.com",
  "Air Canada Aeroplan": "https://www.aircanada.com/aeroplan",
  "Air France-KLM Flying Blue": "https://www.flyingblue.com",
  "Singapore Airlines KrisFlyer": "https://www.singaporeair.com",
  "British Airways Executive Club": "https://www.britishairways.com",
  "Virgin Atlantic Flying Club": "https://www.virginatlantic.com",
  "Alaska Airlines Atmos Rewards": "https://www.alaskaair.com",
  "Turkish Airlines Miles&Smiles": "https://www.turkishairlines.com",
  "Avianca LifeMiles": "https://www.lifemiles.com",
  "Emirates Skywards": "https://www.emirates.com",
};

export function getTransferUrl(programName: string): string | null {
  return TRANSFER_URLS[programName] ?? null;
}

export function getBookingUrl(programName: string): string | null {
  return BOOKING_URLS[programName] ?? null;
}
