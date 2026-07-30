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

## Trip allocator (`src/lib/optimization/trip-allocator.ts`)

The feature that separates this from every competitor. A playbook answers "how do I book this flight?"; a trip is a flight AND a hotel AND maybe an experience funded from **one** pool. Optimize each leg independently and you spend the same 200k Chase points three times — a plan the user cannot execute.

The allocator funds legs in **scarcity order**, then debits the pool before solving the next leg:

1. **Funding breadth** measures scarcity: walk the transfer graph backwards from each award program and count the distinct *held* currencies that can reach it (plus one for a portal fallback). Narrowest first — a flexible leg can absorb what's left, a constrained one can't.
2. Solve each leg with the normal engine against the **remaining** balances.
3. Debit what the chosen path consumed.
4. Report leftovers, blockers with cash fallbacks, and a blended cents-per-point across the trip.

Why not count engine paths as the scarcity proxy? Because the engine stops generating split-source plans once a single program covers a leg, so a leg fundable from Chase *or* Amex reports the same count as one fundable only from Chase. That mis-ordering stranded the constrained leg; `scripts/trip-allocator-test.ts` asserts the fix, plus the core invariant: **no program is ever overspent across legs.**

Unfundable legs are reported with a reason and a cash fallback, never silently dropped.

## Redemption types beyond travel

- **Experiences** (`src/lib/providers/experiences.ts`) — a maintained catalog, because no API exists for issuer experience programs. Two row shapes normalize into one comparable option: fixed awards (points + cash price) and fixed-value channels (a published cents-per-point). `experienceVerdict()` is the honesty layer — it tells users plainly when an experience channel at ~1¢/pt is a worse use of points than a transfer, rather than cheerleading the redemption.
- **Stay enhancements** (`src/lib/optimization/stay-enhancements.ts`) — deterministic rules, not availability data: Marriott/Hilton 5th-night-free (with the "book as ONE reservation" caveat), suite upgrade instruments, IHG 4th-night, and issuer luxury programs (Amex FHR, The Edit by Chase, Cap One Premier Collection) where a *cash* booking with credits can beat an award. Rules that depend on unknown facts (does the user hold status?) are phrased conditionally.
- **Expiry monitoring** (`src/lib/optimization/expiry.ts`) — parses each program's stated policy and the user's reported last-activity date. Warns only when the date is known; an unknown date produces a prompt, never a fabricated deadline.

## Discovery, alerts, and growth features

- **Reverse search** (`/api/explore`, `src/lib/providers/destinations.ts`) — the quota problem defines the design: every candidate destination is a provider call, so we search a curated 32-destination catalog, filter by region and points budget *before* calling out, run lookups sequentially (a parallel burst is the fastest way to get rate-limited upstream), route everything through the shared cache, and cap runs per hour. Destinations you can't fund still appear, with the cheapest award and which program holds it.
- **Flexible dates** (`/api/playbook`, `flexDays`) — prices each candidate date against the user's *balances*, not the raw award chart, because a cheap award in an unreachable program isn't a saving. Winner is fewest points; the response includes every date so the UI can show the strip.
- **Alerts** (`src/lib/optimization/alerts.ts`, `/api/alerts/digest`) — three alert types (transfer bonus, expiry, watch hit) with stable dedupe keys in `alert_log`. GET computes the signed-in user's alerts live and skips watch checks so opening the app never costs quota; POST is the cron job, requires `CRON_SECRET`, uses the service-role client, and runs in **dry-run mode** without `RESEND_API_KEY` — the whole pipeline is testable before an email provider exists. Bonus alerts only fire for currencies the user actually holds; noise gets digests muted.
- **Card recommendations** (`src/lib/optimization/card-recommendations.ts`) — gap-triggered only. The playbook 404 carries the shortfall (program + points), the client asks for recommendations for exactly that gap, and results are ranked by fit then cost-to-hold. If this is ever affiliate-monetized, that ranking rule must not change and the disclosure belongs on the same screen.
- **Caching layer** (`src/lib/providers/cached.ts`) — all award/hotel lookups flow through the shared `award_cache` / `hotel_cache` tables, so a destination priced for one user is free for everyone for six hours. This is what makes reverse search affordable.

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
