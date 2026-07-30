import { Database } from "@/lib/database.types";

type ExperienceRow = Database["public"]["Tables"]["experiences"]["Row"];

/**
 * Experience redemption options.
 *
 * Sourced from our maintained `experiences` catalog (see
 * scripts/seed-experiences.ts for why a catalog rather than an API). Two row
 * shapes are normalized into one comparable option:
 *
 *   - Fixed award   (points_required + cash_price_usd) → cpp = cash / points
 *   - Fixed-value channel (fixed_cpp) → points scale with a target budget
 *
 * The second shape is what lets us answer "should I book this experience
 * with points at all?" — at 1¢/pt an issuer experience channel is almost
 * always a worse use of points than a transfer, and saying so plainly is
 * more valuable to the user than hiding it.
 */

export interface ExperienceOption {
  id: string;
  name: string;
  category: string;
  city: string | null;
  programName: string;
  channel: string;
  pointsRequired: number;
  cashPriceUsd: number;
  /** Value captured, cents per point. */
  cpp: number;
  bookingUrl: string | null;
  notes: string | null;
  /** True when this is a channel rate rather than a specific listing. */
  isChannelRate: boolean;
  verifiedAt: string | null;
}

/**
 * Normalize catalog rows into options. `budgetUsd` prices fixed-value
 * channels — e.g. "what would $400 of experience cost in points here?"
 */
export function toExperienceOptions(
  rows: ExperienceRow[],
  budgetUsd = 400
): ExperienceOption[] {
  const options: ExperienceOption[] = [];

  for (const row of rows) {
    if (!row.is_active) continue;

    if (row.points_required && row.cash_price_usd) {
      const points = row.points_required;
      const cash = Number(row.cash_price_usd);
      options.push({
        id: row.id,
        name: row.name,
        category: row.category,
        city: row.city,
        programName: row.program_name,
        channel: row.channel,
        pointsRequired: points,
        cashPriceUsd: cash,
        cpp: points > 0 ? (cash / points) * 100 : 0,
        bookingUrl: row.booking_url,
        notes: row.notes,
        isChannelRate: false,
        verifiedAt: row.verified_at,
      });
      continue;
    }

    if (row.fixed_cpp) {
      const cpp = Number(row.fixed_cpp);
      if (cpp <= 0) continue;
      const points = Math.round(budgetUsd / (cpp / 100));
      options.push({
        id: row.id,
        name: row.name,
        category: row.category,
        city: row.city,
        programName: row.program_name,
        channel: row.channel,
        pointsRequired: points,
        cashPriceUsd: budgetUsd,
        cpp,
        bookingUrl: row.booking_url,
        notes: row.notes,
        isChannelRate: true,
        verifiedAt: row.verified_at,
      });
    }
  }

  return options.sort((a, b) => b.cpp - a.cpp);
}

/**
 * Verdict copy for an experience option. This is the honesty layer: most
 * issuer experience channels are a poor use of transferable points, and the
 * product should say so rather than cheerlead a redemption.
 */
export function experienceVerdict(
  option: ExperienceOption,
  floorCpp: number | null
): { tone: "good" | "neutral" | "poor"; text: string } {
  if (floorCpp && option.cpp <= floorCpp * 1.1) {
    return {
      tone: "poor",
      text: `At ${option.cpp.toFixed(2)}¢/pt this is roughly what your points are worth as plain cash (${floorCpp.toFixed(2)}¢). Pay cash and keep the points for a transfer redemption instead.`,
    };
  }
  if (option.cpp >= 1.5) {
    return {
      tone: "good",
      text: `${option.cpp.toFixed(2)}¢/pt is a strong experience redemption — comparable to a good flight or hotel award.`,
    };
  }
  return {
    tone: "neutral",
    text: `${option.cpp.toFixed(2)}¢/pt is modest. Worth it when the access itself is the point (hard-to-get tables, sold-out events), not as a way to stretch points.`,
  };
}
