import { z } from "zod";

/**
 * Environment validation — fail loudly and early instead of mysteriously at
 * request time. Server-side only. Optional keys stay optional (the app must
 * always run keyless in mock mode); malformed values are the thing we catch.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  AWARD_PROVIDER: z.enum(["mock", "seatsaero"]).optional(),
  SEATS_AERO_API_KEY: z.string().min(10).optional(),
  AMADEUS_CLIENT_ID: z.string().min(5).optional(),
  AMADEUS_CLIENT_SECRET: z.string().min(5).optional(),
  AMADEUS_BASE_URL: z.string().url().optional(),
  PLAYBOOK_FREE_LIMIT: z.coerce.number().int().min(0).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Warn, don't crash: a typo'd optional key shouldn't take the site down,
    // but it must be visible in logs immediately.
    console.error(
      "[env] Invalid environment configuration:",
      parsed.error.flatten().fieldErrors
    );
    cached = envSchema.parse({});
  } else {
    cached = parsed.data;
    if (cached.AWARD_PROVIDER === "seatsaero" && !cached.SEATS_AERO_API_KEY) {
      console.warn(
        "[env] AWARD_PROVIDER=seatsaero but SEATS_AERO_API_KEY is missing — falling back to mock"
      );
    }
  }
  return cached;
}
