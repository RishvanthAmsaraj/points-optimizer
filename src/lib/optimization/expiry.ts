/**
 * POINTS AT RISK — expiration monitoring.
 *
 * Points expiring is the single most expensive mistake in this hobby and the
 * one nobody notices until it's done. Programs state their rules publicly
 * (N months of inactivity, or a hard expiry from earning), and we already
 * store each program's policy text plus a user-reported last-activity date.
 *
 * We only warn when we KNOW the last activity date. An unknown date produces
 * a prompt to add one, never a fabricated deadline.
 */

/** Months of inactivity before points expire, parsed from policy text. */
export function inactivityMonths(policy: string | null): number | null {
  if (!policy) return null;
  const lower = policy.toLowerCase();
  if (lower.includes("don't expire") || lower.includes("do not expire")) return null;
  const monthMatch = lower.match(/(\d+)\s*months?/);
  if (monthMatch) return Number(monthMatch[1]);
  const yearMatch = lower.match(/(\d+)\s*years?/);
  if (yearMatch) return Number(yearMatch[1]) * 12;
  return null;
}

export interface ExpiryRisk {
  programName: string;
  balance: number;
  /** Days until expiry; negative means the policy window has already passed. */
  daysRemaining: number;
  expiresOn: string;
  policy: string;
  severity: "critical" | "warning" | "watch";
}

export function assessExpiryRisk(
  entries: Array<{
    programName: string;
    balance: number;
    lastActivityAt: string | null;
    expirationPolicy: string | null;
  }>,
  now = new Date()
): ExpiryRisk[] {
  const risks: ExpiryRisk[] = [];

  for (const entry of entries) {
    if (entry.balance <= 0 || !entry.lastActivityAt) continue;
    const months = inactivityMonths(entry.expirationPolicy);
    if (months === null) continue; // program doesn't expire, or policy unparsed

    const expiry = new Date(`${entry.lastActivityAt}T00:00:00Z`);
    expiry.setUTCMonth(expiry.getUTCMonth() + months);
    const daysRemaining = Math.round(
      (expiry.getTime() - now.getTime()) / 86_400_000
    );

    // Only surface what's actionable — a 3-year runway isn't news.
    if (daysRemaining > 365) continue;

    risks.push({
      programName: entry.programName,
      balance: entry.balance,
      daysRemaining,
      expiresOn: expiry.toISOString().slice(0, 10),
      policy: entry.expirationPolicy ?? "",
      severity:
        daysRemaining <= 60 ? "critical" : daysRemaining <= 180 ? "warning" : "watch",
    });
  }

  return risks.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** One concrete action that resets the clock. Any qualifying activity works. */
export function resetAdvice(programName: string): string {
  if (/hyatt|marriott|hilton|ihg|choice|accor/i.test(programName)) {
    return "Any stay, or earning through a dining/shopping partner, resets the clock.";
  }
  if (/chase|amex|citi|capital one|bilt|wells fargo/i.test(programName)) {
    return "Bank points generally don't expire while the account is open — verify your account status.";
  }
  return "A single partner transfer in, a small shopping-portal purchase, or a dining-program earn resets the clock.";
}
