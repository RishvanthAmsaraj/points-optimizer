# Roadmap & Business Logistics

## Where we are

The codebase now runs end-to-end in mock mode: a user adds cards and balances, asks for a trip, and gets a ranked playbook with real multi-hop transfer math, warnings, and honest value numbers. What separates this from launch is live data (partner keys), data-ops discipline, and payments.

## Phase 1 — Live data & private beta

The goal: real playbooks for real routes, tested by ~20 power users from the points community (they will find every data error fast, which is exactly what we want).

- Apply for the Seats.aero partner key (do this first — approval has lead time) and flip `AWARD_PROVIDER=seatsaero`.
- Amadeus production keys for cash fares.
- Establish the data-ops cadence from DATA_SOURCES.md (weekly bonus scan, monthly partner diff, quarterly valuations). Add `promo_ends_at` to transfer_rates once bonus tracking is routine.
- Wire Stripe for the premium tier (env stubs already exist). Simple model: free = 2 playbooks/month (already enforced by the API), premium = unlimited + alerts later.
- Landing page that actually sells the differentiator: "step-by-step playbooks, not search results."

## Phase 2 — The features people pay for

- **Transfer bonus alerts** — "Your 140k MR are worth 182k Virgin miles until March 12." This is the highest-leverage retention feature and falls straight out of `bonus_multiplier` + a cron + email.
- **Hotel awards** — the schema already models hotel programs; add a hotel award provider and portal comparison.
- **Balance auto-sync** — evaluate AwardWallet's account-linking APIs. This changes our security posture (see DATA_SOURCES.md §4), so it's a deliberate decision, not a default.
- **Mixed-itinerary optimization** — outbound on one program, return on another. Competitors don't do this well.
- **Card recommendations** — "you're 60k short for this trip; this card's signup bonus covers it." This is also the monetization bridge (below).

## Phase 3 — Scale & concierge

The stated target user — high-balance individuals who find this whole world a hassle — suggests a high-touch tier: a human-reviewed playbook plus booking hand-holding at a premium price. Software margins on the self-serve tier, service margins on top. Also: API/white-label for financial advisors and family offices who field these questions constantly.

## Monetization summary

1. **Subscriptions** (Phase 1): free preview → premium unlimited. Priced against point.me ($129/yr area) with the playbook differentiator.
2. **Card affiliate revenue** (Phase 2): only inside genuinely-relevant recommendations, always FTC-disclosed. The trust bar here is the product — recommendation integrity is why users stay.
3. **Concierge tier** (Phase 3): high-touch playbooks for high-balance users.

## Honest risks

- **Data dependency**: Seats.aero is effectively a single supplier for award data. Mitigation: the provider abstraction keeps switching costs low; pursue a second source once revenue justifies it.
- **Data accuracy**: one wrong transfer ratio can cost a user real money and us their trust. Mitigation: ops cadence, warnings on every irreversible step, and "confirm with the airline" messaging baked into the product.
- **Platform risk**: issuers occasionally change transfer rules abruptly. This is also the opportunity — being the fastest to reflect changes is a moat.
- **Incumbents**: point.me and Roame have the search problem covered. We don't win on search; we win on "tell me exactly what to do with what I already have."
