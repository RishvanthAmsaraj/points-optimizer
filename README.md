# Points Optimizer

A web platform that helps users maximize credit card points and miles for travel redemptions.

## Core Value Proposition

Tell us what you have, tell us where you want to go, and we'll build you the exact playbook to get there for the fewest points.

## What Makes Us Different

Unlike existing search tools (Point.me, Roame), we provide **step-by-step optimization playbooks** — not just search results, including multi-hop transfer chains (e.g. Chase → Marriott → Alaska) that most tools and most humans miss. We bridge the gap between "I have points" and "I know exactly what to do."

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
npx tsx scripts/seed-programs.ts
npx tsx scripts/seed-transfer-rates.ts
```

The app runs fully in mock mode with zero external API keys — see `docs/DATA_SOURCES.md` for going live.

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system design, the optimization engine, security model
- [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) — where every piece of data comes from, costs, legal constraints, ops cadence
- [`docs/API_KEYS.md`](./docs/API_KEYS.md) — every account to create, verified free tiers, setup order
- [`docs/TESTING.md`](./docs/TESTING.md) — exact test scenarios with expected outcomes
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phased plan, monetization, risks

## Status

- [x] User onboarding & points inventory
- [x] Credit card wallet
- [x] Optimization playbook generator (multi-hop transfer engine)
- [x] Award search provider layer (mock + Seats.aero + Amadeus adapters)
- [ ] Live partner API keys (Seats.aero approval pending)
- [ ] Stripe premium subscriptions
- [ ] Transfer bonus alerts

## License

All Rights Reserved. See [LICENSE](./LICENSE) for details.
