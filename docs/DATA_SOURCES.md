# Data Sources

Where every piece of data in Points Optimizer comes from, what it costs, and what the legal constraints are. This is the make-or-break document for the business: the optimization engine is only as good as the data feeding it.

## The four data problems

The product needs four distinct kinds of data, and they have very different sourcing stories.

| Data | Changes | Source strategy | Status |
|---|---|---|---|
| Award availability & pricing | Constantly (minutes) | Licensed API (Seats.aero) | Adapter built, needs partner key |
| Cash fare comparison | Constantly | Amadeus Self-Service API | Adapter built, free test tier |
| Transfer partners, ratios, bonuses | Monthly-ish | Self-maintained tables + review cadence | Seeded, needs ops process |
| Point valuations | Quarterly | Self-maintained, informed by industry consensus | Seeded |

## 1. Award availability — Seats.aero Partner API

This is the hard problem. Airlines do not publish award availability APIs, and **scraping airline websites is not an option**: it violates their terms of service, breaks constantly as sites change, gets IPs banned, and creates real legal exposure (airlines have litigated against scrapers). Every serious player in this space either licenses data or builds airline partnerships.

**Seats.aero** is the pragmatic choice. They maintain a continuously-refreshed cache of award availability across ~20 mileage programs (Aeroplan, United, American, Alaska, Flying Blue, Virgin Atlantic, etc.) and license it through a Partner API.

- Apply at https://developers.seats.aero — access is granted case-by-case, so apply early with a description of the product.
- Their data is **cached**, not live. Availability can be minutes-to-hours stale. Product implication: always tell users to confirm space with the airline *before* transferring points. The engine bakes this warning into every irreversible transfer step.
- Requests are metered. Our mitigation: the `award_searches` table caches results for 6 hours per (origin, destination, date, cabin), so repeat queries cost nothing.
- The adapter lives at `src/lib/providers/seatsaero.ts`. Verify response field names against their current docs before going live — the mapping is written defensively and drops rows it can't parse.

Alternatives if Seats.aero doesn't work out: point.me licenses to enterprises (likely expensive), AwardWallet has APIs oriented at balance tracking rather than availability, or direct airline NDC partnerships (long-term play, months of BD work per airline).

## 2. Cash fares — Amadeus Self-Service API

Without a real cash price, cents-per-point math is fiction, and cpp is the number the whole ranking hangs on.

- **Amadeus Flight Offers Search**: free test tier at `test.api.amadeus.com` (monthly quota, slightly stale fares — fine for development), pay-as-you-go production tier (fractions of a cent per query at our scale).
- Sign up at https://developers.amadeus.com, set `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`.
- Adapter: `src/lib/providers/amadeus.ts`. It degrades gracefully — if the lookup fails, playbooks still generate, just without cpp/savings figures.
- Alternatives: Duffel (nicer API, similar pricing), Kiwi Tequila, Skyscanner (partnership required).

## 3. Transfer rules — self-maintained (this is our moat)

There is no API for "which programs transfer to which, at what ratio, with what bonuses." Everyone in this industry maintains this by hand, and doing it *accurately* is a genuine competitive advantage. Our model (see migration 002):

- `ratio` — permanent published rate (destination units per source unit). Chase→United = 1.0, Amex→Hilton = 2.0, Marriott→airlines = 0.3333.
- `bonus_multiplier` — temporary promos only (a 30% Virgin transfer bonus = 1.30 for the duration, then back to 1.00). Transfer bonuses are one of the biggest value unlocks in the hobby; tracking them well is a feature users will pay for.
- `block_size` / `block_bonus` — step bonuses like Marriott's +5,000 miles per 60,000 transferred.
- `increment`, `minimum_transfer`, `typical_timing`, `is_reversible` — execution constraints the engine respects.

**Ops cadence (assign an owner):**
- Weekly: scan issuer/partner announcements for transfer bonuses; update `bonus_multiplier` with start/end dates (add a `promo_ends_at` column when this becomes routine).
- Monthly: diff partner lists against issuer pages (Chase, Amex, Citi, Capital One, Bilt) and Marriott's airline list.
- Quarterly: review point valuations (`loyalty_programs.point_valuation_cents`) against published industry valuations, but form our own view — our valuations feed the ranking.

Monitoring sources: issuer program pages (ground truth), plus the trade press (Frequent Miler, One Mile at a Time, TPG) as change-detection tripwires — verify against the issuer before updating data.

## 4. Hotel awards — chart-maintained (and why that's not a hack)

There is **no licensed API for hotel award pricing** — nothing like Seats.aero exists for hotels at partner-API terms. Every credible tool in this space maintains award charts and bands by hand, and so do we (`src/lib/providers/hotel-charts.ts`):

- **World of Hyatt still publishes a real award chart** (categories 1–8 with fixed standard-room rates), so Hyatt data can be genuinely accurate — and Hyatt via Chase 1:1 is the single best hotel value in the game, which is why it anchors our hotel playbooks.
- **Marriott, Hilton, and IHG price dynamically**, so we model realistic per-city-tier bands and label results "-equivalent" rather than pretending to quote a specific property. Honest labeling is the feature: users get the transfer math and the value verdict, then confirm the exact property on the program's site (the book step links there).
- The **cash comparison** comes from the Amadeus Hotel Search API (Hotel List by city → Hotel Offers v3, median of returned rates) — included in Amadeus Self-Service with its own free monthly quota, same account as flights. Falls back to deterministic mocks keyless.
- Ops cadence addition: verify Hyatt's chart and the dynamic bands quarterly; city-tier table grows as users search new cities (unknown cities default to tier 3 with a wide band).
- Future upgrades: awayz.com and similar hotel-award search products are potential partners if they open APIs; nothing licensable exists today.

## 5. What we deliberately do NOT collect

The privacy stance is a feature, not a limitation, and it's what keeps compliance simple:

- **No card numbers, ever.** Users tell us which cards they hold and their point balances — that's it. No PANs means no PCI-DSS scope.
- **No bank or loyalty-account credentials.** Balance auto-sync (e.g. via AwardWallet's account-linking APIs) is a Phase 2+ decision that would change our security posture significantly; if we do it, it goes through their vetted infrastructure, never credentials stored by us.
- Self-reported balances are stored under row-level security keyed to the user (see migrations 001/002).

## Legal & compliance notes

Not legal advice — get a real lawyer before launch, but these are the known issues to raise with them:

1. **No scraping** of airline or bank sites (ToS violations; airlines have litigated). Licensed APIs only.
2. **Disclaimers**: award pricing/availability changes without notice; we're not a travel agency (we never take payment for travel or ticket anyone — users book directly with airlines); we're not providing financial advice. The engine attaches this to every playbook (`meta.disclaimer`).
3. **Affiliate compliance**: if we monetize card referrals (see ROADMAP), FTC disclosure rules and issuer affiliate-network terms (e.g. clear "we may earn a commission" labeling) apply.
4. **Trademark care**: program names are used nominatively (to refer to the actual programs); don't imply endorsement by Chase/Amex/Marriott/etc.
