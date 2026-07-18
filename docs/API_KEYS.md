# API Keys & Services — the free-first stack

Every account to create, what it costs, and the order to do it in. Optimized for the stated constraint: **$0 for development, near-$0 for testing and early launch.** Pricing below was checked July 2026 — re-verify before committing a card.

## Cost summary

| Phase | Monthly cost | What you're paying for |
|---|---|---|
| Development (today) | **$0** | Everything runs on mock data + free tiers |
| Testing with live award data | **~$10** | Seats.aero Pro (personal Partner API key) |
| Private beta | **~$10** | Same; users can OAuth their own Seats.aero accounts |
| Public launch | $10 + usage | Amadeus production overage, Stripe per-transaction, Vercel Pro if needed |

## Tier 0 — required, free, do these first

**Supabase** (already integrated) — supabase.com. Free tier: 500MB Postgres, 50k monthly active users, auth included. Paid starts at $25/mo only when you outgrow it. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Vercel** — vercel.com. Hobby tier is free and fine for beta (Next.js native, custom domain, HTTPS). Note: Hobby is for non-commercial use — move to Pro ($20/mo) when you start charging.

## Tier 1 — live data (the ones that matter)

**Seats.aero** — award availability. This is the key dependency and the pleasant surprise on cost: **Pro is $9.99/month, and eligible Pro users can generate a personal Partner API key with up to 1,000 API calls/day at no extra cost** (key lives in account settings; sent via the `Partner-Authorization` header, which is exactly how our adapter works). Env: `AWARD_PROVIDER=seatsaero`, `SEATS_AERO_API_KEY`.

Three compliance facts to plan around, straight from their docs:
1. The Pro key covers **cached availability search** — their **Live Search endpoint is restricted to approved commercial partners**, full stop. Our adapter uses cached search, so this fits, but it reinforces the "confirm space with the airline before transferring" product rule.
2. Their terms **prohibit commercial use of the API without written permission**. Personal-key use is fine while building and testing. For launch, email [email protected] from a company address with a detailed use case — they grant commercial access case-by-case and explicitly warn that many use cases are not supported, so treat approval as a milestone, not a formality, and have the conversation early.
3. API key eligibility can be limited by region or at their discretion — verify you can actually generate a key right after subscribing.

There's also a sanctioned integration path worth pursuing: Seats.aero runs a **"Connect seats.aero"** program where select third-party apps let users link their *own* Pro accounts (aeroconnections.app, bbairtools.com, and others already do this). Getting Points Optimizer onto that list solves both quota and commercial-permission questions at once — raise it in the same email.

**Amadeus for Developers** — cash fare baseline. Free **test environment** (capped monthly quota per API, slightly stale data — fine for development), and even the **production** tier includes a free monthly allowance for Flight Offers Search (on the order of a couple thousand calls) before pay-as-you-go kicks in at fractions of a cent per call. At beta scale this stays $0. Sign up at developers.amadeus.com → Self-Service → create app. Env: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, and set `AMADEUS_BASE_URL=https://api.amadeus.com` only when you switch to production keys. The **same account and keys also power hotel cash comparisons** (Hotel List + Hotel Search v3) — every Self-Service API carries its own free monthly quota in both test and production, so hotels add no cost at beta scale.

## Tier 2 — launch operations (all have real free tiers)

**Stripe** — subscriptions. No monthly fee; 2.9% + 30¢ per successful charge. Test mode is free forever. Env vars already stubbed in `.env.example`.

**Resend** — transactional email (confirmations now; transfer-bonus alerts in Phase 2). Free: 3,000 emails/mo, 100/day. resend.com.

**Sentry** — error tracking. Free developer tier (5k errors/mo) is plenty for beta. sentry.io.

**PostHog** or **Vercel Web Analytics** — product analytics. PostHog free tier is ~1M events/mo (generous); Vercel's basic analytics are included on Hobby. Pick one, not both.

**UptimeRobot** — free uptime pings on the production URL.

## Deliberately NOT on the list (and why)

- **AwardWallet API** — balance auto-sync. Application-gated partnership and it changes our security posture (users' loyalty credentials). Phase 2+ decision, not a launch dependency — self-reported balances are the feature, not a gap.
- **point.me / Roame data** — enterprise licensing, no public pricing; also they're competitors.
- **Duffel / Kiwi** — solid Amadeus alternatives for cash fares, but Amadeus's free allowance wins at our scale. Revisit if Amadeus data quality disappoints on specific routes.
- **Any scraping of airline/bank sites** — ToS violations and legal risk regardless of budget (see DATA_SOURCES.md).
- **Google Fonts hosting decision:** fonts load via `next/font` at build time (free, no key). If your build environment blocks fonts.googleapis.com, `next/font` falls back per its config — no action needed on normal networks.

## Setup order checklist

1. Supabase project → run migrations 001–003 → run the three seed scripts.
2. Vercel project → connect repo → add all env vars → deploy (mock mode works immediately).
3. Amadeus test keys → add env vars → cash fares go live.
4. Seats.aero Pro → generate the partner key → `AWARD_PROVIDER=seatsaero` → real award space. **In parallel: email [email protected] about commercial permission and the Connect program.**
5. Stripe test mode → build the upgrade flow (Phase 1 roadmap).
6. Resend + Sentry + analytics when beta users arrive.
