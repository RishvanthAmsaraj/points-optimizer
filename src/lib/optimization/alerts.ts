import { Database } from "@/lib/database.types";
import { effectiveMultiplier } from "./engine";
import { assessExpiryRisk } from "./expiry";

type TransferRate = Database["public"]["Tables"]["transfer_rates"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type PointsBalance = Database["public"]["Tables"]["points_balances"]["Row"];

/**
 * ALERTS DIGEST
 *
 * Three alert types, all built from data we already maintain:
 *   1. transfer_bonus — a live promo on an edge OUT of a currency the user
 *      actually holds, sized in their own balance ("your 140k becomes 182k").
 *   2. expiry — points at risk on their reported activity dates.
 *   3. watch_hit — a saved route/city now meets their target.
 *
 * Every alert carries a stable dedupe key so a daily job never re-sends the
 * same news. Relevance rules are strict on purpose: an alert about a currency
 * the user doesn't hold is noise, and noise gets digests muted.
 */

export interface Alert {
  type: "transfer_bonus" | "expiry" | "watch_hit";
  dedupeKey: string;
  title: string;
  body: string;
  urgency: "high" | "normal";
  payload: Record<string, unknown>;
}

export function buildTransferBonusAlerts(
  balances: PointsBalance[],
  programs: LoyaltyProgram[],
  rates: TransferRate[],
  now = new Date()
): Alert[] {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const heldBalance = new Map(
    balances.filter((b) => b.balance > 0).map((b) => [b.program_id, b.balance])
  );
  const alerts: Alert[] = [];

  for (const rate of rates) {
    const multiplier = effectiveMultiplier(rate, now);
    if (multiplier <= 1) continue;

    const balance = heldBalance.get(rate.from_program_id);
    if (!balance) continue; // don't alert on currencies they don't hold

    const from = programById.get(rate.from_program_id);
    const to = programById.get(rate.to_program_id);
    if (!from || !to) continue;

    const pct = Math.round((multiplier - 1) * 100);
    const normalYield = Math.floor(balance * Number(rate.ratio));
    const promoYield = Math.floor(balance * Number(rate.ratio) * multiplier);
    const endsOn = rate.promo_ends_at;
    const daysLeft = endsOn
      ? Math.round(
          (new Date(endsOn).getTime() - now.getTime()) / 86_400_000
        )
      : null;

    alerts.push({
      type: "transfer_bonus",
      dedupeKey: `bonus:${rate.from_program_id}:${rate.to_program_id}:${endsOn ?? "open"}`,
      title: `+${pct}% ${from.name} → ${to.name}`,
      body: `Your ${balance.toLocaleString()} ${from.name} points would transfer as ${promoYield.toLocaleString()} ${to.name} miles instead of ${normalYield.toLocaleString()} — ${(promoYield - normalYield).toLocaleString()} extra${endsOn ? `, through ${endsOn}` : ""}. Only transfer against a confirmed award; the bonus doesn't make a speculative transfer safe.`,
      urgency: daysLeft !== null && daysLeft <= 7 ? "high" : "normal",
      payload: { from: from.name, to: to.name, pct, endsOn, balance },
    });
  }

  return alerts;
}

export function buildExpiryAlerts(
  balances: PointsBalance[],
  programs: LoyaltyProgram[],
  now = new Date()
): Alert[] {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const risks = assessExpiryRisk(
    balances.map((b) => {
      const program = programById.get(b.program_id);
      return {
        programName: program?.name ?? "Unknown program",
        balance: b.balance,
        lastActivityAt: b.last_activity_at,
        expirationPolicy: program?.expiration_policy ?? null,
      };
    }),
    now
  );

  return risks
    .filter((r) => r.severity !== "watch") // only warn when it's actionable
    .map((r) => ({
      type: "expiry" as const,
      dedupeKey: `expiry:${r.programName}:${r.expiresOn}`,
      title: `${r.balance.toLocaleString()} ${r.programName} points at risk`,
      body: `On your reported activity these expire around ${r.expiresOn} (${r.daysRemaining} days). Any qualifying earn or redemption resets the clock — a single partner transaction is usually enough.`,
      urgency: r.severity === "critical" ? ("high" as const) : ("normal" as const),
      payload: { program: r.programName, expiresOn: r.expiresOn, balance: r.balance },
    }));
}

export interface WatchHit {
  watchId: string;
  label: string;
  cpp: number;
  totalPoints: number;
  targetCpp: number | null;
  maxPoints: number | null;
  date: string;
}

export function buildWatchAlerts(hits: WatchHit[]): Alert[] {
  return hits.map((hit) => ({
    type: "watch_hit" as const,
    dedupeKey: `watch:${hit.watchId}:${hit.date}:${hit.totalPoints}`,
    title: `${hit.label} just hit your target`,
    body:
      `Now ${hit.totalPoints.toLocaleString()} points at ${hit.cpp.toFixed(2)}¢/pt on ${hit.date}` +
      (hit.targetCpp ? ` (your target: ${hit.targetCpp.toFixed(2)}¢)` : "") +
      (hit.maxPoints ? ` (your cap: ${hit.maxPoints.toLocaleString()} pts)` : "") +
      `. Award space moves fast — confirm it's still there before transferring.`,
    urgency: "high" as const,
    payload: { watchId: hit.watchId, cpp: hit.cpp, points: hit.totalPoints, date: hit.date },
  }));
}

/** Plain-text digest body. Swap for an HTML template when Resend is wired. */
export function renderDigest(alerts: Alert[], displayName?: string | null): string {
  if (alerts.length === 0) return "";
  const lines: string[] = [];
  lines.push(displayName ? `Hi ${displayName},` : "Hi,");
  lines.push("");
  lines.push("Here's what changed for your points:");
  lines.push("");
  const high = alerts.filter((a) => a.urgency === "high");
  const normal = alerts.filter((a) => a.urgency !== "high");
  for (const alert of [...high, ...normal]) {
    lines.push(`${alert.urgency === "high" ? "** " : "- "}${alert.title}`);
    lines.push(`  ${alert.body}`);
    lines.push("");
  }
  lines.push(
    "Award pricing and transfer rules change without notice. Confirm availability before transferring — most transfers can't be reversed."
  );
  return lines.join("\n");
}
