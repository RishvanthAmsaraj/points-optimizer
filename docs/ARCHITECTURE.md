# Architecture

## System overview

```
                        ┌──────────────────────────────┐
                        │  Next.js app (Vercel)        │
                        │                              │
 Browser ──────────────▶│  pages: /playbook /points    │
                        │         /cards /dashboard    │
                        │                              │
                        │  API route: /api/playbook ───┼──▶ Providers
                        │        │                     │     ├─ Seats.aero (awards)
                        │        ▼                     │     ├─ Amadeus (cash fares)
                        │  Optimization engine         │     └─ Mock (dev/demo)
                        └────────┬─────────────────────┘
                                 │
                                 ▼
                        ┌──────────────────────────────┐
                        │  Supabase (Postgres + Auth)  │
                        │  profiles, user_cards,       │
                        │  points_balances, playbooks, │
                        │  loyalty_programs,           │
                        │  transfer_rates,             │
                        │  award_searches (cache)      │
                        └──────────────────────────────┘
```

Design rule that everything follows: **user-supplied state lives in Supabase behind RLS; external market data comes through the provider layer and is only ever cached, never treated as ours.**

## Request lifecycle: building a playbook

1. `POST /api/playbook` validates the query (zod, IATA codes, ≤9 pax) and checks auth + tier (free accounts get `PLAYBOOK_FREE_LIMIT` playbooks/month; premium unlimited).
2. Award availability: check the `award_searches` cache (6h TTL per origin/destination/date/cabin); on miss, call the configured `AwardProvider` and cache the result.
3. Cash baseline: `CashPriceProvider` fetches the comparable cash fare (best effort — a failure degrades cpp/savings display, never the playbook).
4. Provider results (keyed by program *name*) are resolved to `loyalty_programs` rows; unknown programs are dropped with a warning.
5. The engine (below) produces ranked `PaymentPath`s.
6. The playbook is persisted for history, and the API returns the full computed result — the response shape never depends on whether the save succeeded.

## The optimization engine (`src/lib/optimization/engine.ts`)

The engine is **redemption-agnostic**: an award is "a program, a points price, fees, and a cash comparison," whether that's a business-class seat or three nights at a Hyatt. Flight and hotel playbooks share one engine, one scoring model, one UI — adding a redemption type means adding a provider, not an engine. Every path also carries the **cash-out floor**: what the bank-currency points spent would be worth as plain cash/statement credits (config `REDEMPTION_FLOORS`), and how many times the redemption beats it. That's the honest "should I even bother" number.

The core insight: **transfer partners form a directed graph.** Nodes are loyalty programs; edges are transfer rates. Finding the cheapest way to fund an award is a bounded backwards graph search from the award's program toward programs where the user actually holds points.

For each bookable award, the engine generates funding plans:

- **Balance plan** — the user already has enough miles in the award program.
- **Single-source chains** — DFS backwards through incoming transfer edges (max 2 hops; that covers every realistic pattern: bank → airline, and bank → hotel → airline like Chase → Marriott → Alaska). At each hop the engine computes the exact source-side points needed by inverting the edge's yield function.
- **Split-source plan** — when no single program covers the need, combine several 1-hop transfers that all converge on the award program (miles must land in one account to book). Sources are drained best-effective-ratio first.
- **Portal paths** — book the cash fare through a bank portal at that program's fixed value, as a baseline competitor.

Transfer math handles the real-world mess: per-edge transfer increments (usually 1,000), minimum transfers, temporary promo multipliers, and block bonuses (Marriott's +5,000 per 60,000) via an inverse-yield solver in `sourcePointsNeeded()`.

Paths are scored on weighted value (cpp), simplicity (step count), speed (slowest hop's typical timing), and risk (irreversible or lossy hops), with weights in `config.ts`. Every path carries human-readable `warnings` — e.g. "confirm award space before transferring; this transfer can't be reversed" — because giving users confident-looking instructions without the risk context would be doing them a disservice.

Tuning knobs live in `src/lib/optimization/config.ts` (portal values, score weights, timing scores, program URLs) so data updates never touch algorithm code.

### Known simplifications (documented on purpose)

- Portal values are per-program, not per-card (a Sapphire Reserve boosts Chase portal value vs. a Preferred). We use the conservative value; wiring card-level multipliers through `user_cards` is on the roadmap.
- Partial balances are only used at the *target* program, not at intermediate hops — intermediate partials explode the search space for negligible real-world gain.
- One-way pricing: round trips are approximated by the provider layer; itinerary-level pricing (mixed programs per direction) is a Phase 2 feature and a genuinely differentiating one.

## Robustness

- `src/lib/env.ts` — zod-validated environment at boot; malformed keys log loudly instead of failing mysteriously at request time. The app always runs keyless (mock mode).
- `/api/health` — public health endpoint (config presence + DB ping) for uptime monitoring.
- Rate limits — 10 playbooks/hour for everyone (protects provider quota) plus the free-tier monthly cap; both DB-backed so they work on serverless.
- Provider failures — award-data outages return a friendly 503; cash-price failures degrade silently (playbook still generates, just without cpp).
- Date validation — bookings limited to a ~360-day horizon, stays to 30 nights; past dates rejected with clear messages.
- Caches — `award_cache` and `hotel_cache` are shared market-data tables (6h TTL) so identical queries never re-burn quota.

## Security model

- Supabase RLS on all user tables (migration 001) **and** on reference tables (migration 002 — previously anyone with the public anon key could rewrite our transfer rates; now reference tables are public-read, service-role-write only).
- The service-role key exists only in seed scripts / server env, never in client bundles.
- No card numbers or loyalty credentials are collected anywhere (see DATA_SOURCES.md §4).
- Session refresh runs in `src/proxy.ts` (Next 16 middleware convention) via `@supabase/ssr`.

## Conventions for contributors

- Never call an external API from a page or component — everything goes through `src/lib/providers/` behind an interface, selected by env in `providers/index.ts`. The app must always run with zero API keys (mock mode).
- Schema changes = new numbered migration + hand-update `src/lib/database.types.ts` (or regenerate with `npm run db:types`).
- Transfer-rate semantics are documented in migration 002 — read it before touching rate data.
