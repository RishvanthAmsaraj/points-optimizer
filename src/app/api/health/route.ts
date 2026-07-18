import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import { NextResponse } from "next/server";

/**
 * Health endpoint for uptime monitoring (pair with UptimeRobot — see
 * docs/API_KEYS.md). Public by design; reveals configuration *presence*,
 * never values.
 */
export async function GET() {
  const env = getEnv();
  const checks: Record<string, boolean | string> = {
    supabaseConfigured:
      !!env.NEXT_PUBLIC_SUPABASE_URL && !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    awardProvider:
      env.AWARD_PROVIDER === "seatsaero" && env.SEATS_AERO_API_KEY
        ? "seatsaero"
        : "mock",
    cashProvider:
      env.AMADEUS_CLIENT_ID && env.AMADEUS_CLIENT_SECRET ? "amadeus" : "mock",
    database: false,
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("loyalty_programs")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  const ok = checks.supabaseConfigured === true && checks.database === true;
  return NextResponse.json(
    { ok, checks, time: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
