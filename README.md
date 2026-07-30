# Points Optimizer

A web platform that helps users maximize credit card points and miles for travel redemptions.

## Core Value Proposition

Tell us what you have, tell us where you want to go, and we'll build you the exact playbook to get there for the fewest points.

## What Makes Us Different

Unlike existing search tools (Point.me, Roame), we provide **step-by-step optimization playbooks** — not just search results — across **flights AND hotel stays**, including multi-hop transfer chains (e.g. Chase → Marriott → Alaska) that most tools and most humans miss, with every route measured against your **cash-out floor** so you never redeem below what your points are worth as plain cash. We bridge the gap between "I have points" and "I know exactly what to do."

We never collect card numbers or loyalty-account credentials. Users self-report cards and balances; everything else comes from licensed market data.

## Tech Stack

- **Frontend:** Next.js + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes + Supabase (Postgres, Auth, RLS)
- **Data:** pluggable providers — Seats.aero (award availability), Amadeus (cash fares), deterministic mocks for dev
- **Hosting:** Vercel

## Getting started

```bash
cp .env.example .env.local   # fill in Supabase keys; leave providers on mock
npm install
npm run dev
```

Apply migrations in `supabase/migrations/` in order, then seed reference data:

```bash
npm run seed:all      # programs, transfer rates, cards, experiences
```

The app runs fully in mock mode with zero external API keys — see `docs/DATA_SOURCES.md` for going live.

## Verify without a browser

```bash
npm run test:engine   # engine, scenarios, trip allocator, feature logic
```

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system design, the optimization engine, security model
- [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) — where every piece of data comes from, costs, legal constraints, ops cadence
- [`docs/API_KEYS.md`](./docs/API_KEYS.md) — every account to create, verified free tiers, setup order
- [`docs/TESTING.md`](./docs/TESTING.md) — exact test scenarios with expected outcomes
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phased plan, monetization, risks

## Status

- [x] User onboarding & points inventory
- [x] Credit card wallet
- [x] Optimization playbook generator (multi-hop transfer engine, flights + hotels)
- [x] Hotel award playbooks (Hyatt/Marriott/Hilton/IHG charts + Amadeus cash comparison)
- [x] Cash-out floor engine ("never redeem below this" on every playbook and the dashboard)
- [x] Award search provider layer (mock + Seats.aero + Amadeus adapters)
- [x] Hardening: env validation, /api/health, hourly rate limits, shared market-data caches
- [x] **Trip planner** — one points pool allocated across flight + hotel + experience without double-spending
- [x] Experiences catalog (Amex/Chase/Cap One channels, Hyatt FIND, Bonvoy Moments) with honest value verdicts
- [x] Stay enhancements — 5th-night-free, suite upgrades, FHR/Edit/Premier Collection comparisons
- [x] Points-at-risk expiry monitoring + live transfer-bonus tracking with promo windows
- [x] Catalog: 31 cards across 8 issuers, 41 programs, 87 transfer edges
- [x] **Reverse search** — "where can I go?" priced against real balances across 32 award destinations
- [x] **Flexible dates** — ±3 day search, each date priced against your balances
- [x] **Alerts engine** — transfer bonuses, expiry warnings, watched routes; cron job with dry-run mode
- [x] **Card recommendations** — triggered only by a real shortfall, ranked by fit and cost, never by commission
- [x] Saved history with trip and playbook detail views
- [x] Onboarding wizard, pricing/upgrade page, Stripe Checkout route
- [ ] Stripe webhook to set subscription_tier (the one backend wire left)
- [ ] Live partner API keys (Seats.aero approval pending)
- [ ] Stripe premium subscriptions
- [ ] Transfer bonus alerts

## License

All Rights Reserved. See [LICENSE](./LICENSE) for details.
