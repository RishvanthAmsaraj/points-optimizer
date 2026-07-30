import { createClient } from '@supabase/supabase-js';

/**
 * Experiences catalog seed.
 *
 * WHY THIS IS A HAND-MAINTAINED CATALOG: there is no API — public or
 * licensed — for issuer experience programs (Amex Experiences, Chase
 * Experiences, Capital One Dining/Entertainment) or hotel money-can't-buy
 * offers (Marriott Bonvoy Moments, Hyatt FIND). These are curated, rotating
 * inventories behind cardholder logins. Every competitor either ignores this
 * category or links out blindly. Our angle: catalog the RECURRING,
 * predictable inventory plus the fixed-value redemption channels, and apply
 * the same cents-per-point math we use for flights and hotels, so users can
 * see when an experience is a great use of points and when it is terrible.
 *
 * Two kinds of row:
 *   - points_required + cash_price_usd -> a specific award (Moments-style
 *     packages, fixed-price event redemptions). cpp = cash / points.
 *   - fixed_cpp -> a CHANNEL that redeems at a published rate (portal
 *     experience bookings, dining credits). Points needed scale with price.
 *
 * `verified_at` is the data-ops audit date. Rows older than a quarter should
 * be re-checked (see docs/DATA_SOURCES.md).
 */

interface ExperienceSeed {
  name: string;
  category: 'dining' | 'event' | 'tour' | 'wellness' | 'access' | 'transfer';
  city?: string;
  city_code?: string;
  country?: string;
  program_name: string;
  channel: string;
  points_required?: number;
  cash_price_usd?: number;
  fixed_cpp?: number;
  booking_url?: string;
  notes?: string;
  verified_at: string;
}

const experiences: ExperienceSeed[] = [
  // ---------------------------------------------------------------------------
  // Fixed-value channels — always available, price scales with the booking.
  // These are the honest baseline for "can I use points for experiences at all".
  // ---------------------------------------------------------------------------
  {
    name: 'Amex Experiences & event tickets',
    category: 'access',
    program_name: 'Amex Membership Rewards',
    channel: 'Amex Experiences',
    fixed_cpp: 1.0,
    booking_url: 'https://www.americanexpress.com/en-us/benefits/experiences/',
    notes: 'Presale access and curated events. Points redeem near 1¢ — usually a poor use of MR versus transferring to airline partners, which is exactly what we tell you.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Chase Experiences (sports, music, dining)',
    category: 'access',
    program_name: 'Chase Ultimate Rewards',
    channel: 'Chase Experiences',
    fixed_cpp: 1.0,
    booking_url: 'https://www.chase.com/personal/credit-cards/experiences',
    notes: 'Cardholder presales and packages. Points value is fixed and low — better as a cash purchase while points go to transfer partners.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Capital One Dining reservations',
    category: 'dining',
    program_name: 'Capital One Miles',
    channel: 'Capital One Dining',
    fixed_cpp: 1.0,
    booking_url: 'https://www.capitalonedining.com/',
    notes: 'Hard-to-get tables and chef events; miles redeem at 1¢. Access is the value here, not the redemption rate.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Capital One Entertainment tickets',
    category: 'event',
    program_name: 'Capital One Miles',
    channel: 'Capital One Entertainment',
    fixed_cpp: 1.0,
    booking_url: 'https://www.capitalone.com/entertainment/',
    notes: 'Concerts and sports with miles at 1¢. Compare against face value before redeeming.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Hyatt FIND experiences',
    category: 'tour',
    program_name: 'World of Hyatt',
    channel: 'Hyatt FIND',
    fixed_cpp: 1.8,
    booking_url: 'https://world.hyatt.com/content/gp/en/rewards/find-experiences.html',
    notes: 'Hyatt points on experiences hold up better than most issuer channels because Hyatt points are worth more to begin with.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Marriott Bonvoy Moments auctions & packages',
    category: 'event',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    fixed_cpp: 0.9,
    booking_url: 'https://moments.marriottbonvoy.com/',
    notes: 'Auction-based, so effective value swings wildly. Bid discipline matters more than the chart.',
    verified_at: '2026-07-01',
  },

  // ---------------------------------------------------------------------------
  // Recurring city-specific inventory. Points/cash figures are typical
  // observed values for planning, not live quotes — the booking link is
  // always the source of truth.
  // ---------------------------------------------------------------------------
  {
    name: 'Michelin-starred tasting menu for two',
    category: 'dining',
    city: 'Tokyo', city_code: 'TYO', country: 'Japan',
    program_name: 'Capital One Miles',
    channel: 'Capital One Dining',
    points_required: 60000, cash_price_usd: 600,
    booking_url: 'https://www.capitalonedining.com/',
    notes: 'Reservation access is the real prize; two seats at a counter that is otherwise booked out months ahead.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Private sushi counter experience',
    category: 'dining',
    city: 'Tokyo', city_code: 'TYO', country: 'Japan',
    program_name: 'World of Hyatt',
    channel: 'Hyatt FIND',
    points_required: 25000, cash_price_usd: 450,
    booking_url: 'https://world.hyatt.com/content/gp/en/rewards/find-experiences.html',
    notes: '1.8¢/pt — one of the few experience redemptions that beats a cash purchase.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Broadway premium seats (pair)',
    category: 'event',
    city: 'New York', city_code: 'NYC', country: 'United States',
    program_name: 'Amex Membership Rewards',
    channel: 'Amex Experiences',
    points_required: 40000, cash_price_usd: 400,
    booking_url: 'https://www.americanexpress.com/en-us/benefits/experiences/',
    notes: 'Cardholder presale windows matter more than the points rate here.',
    verified_at: '2026-07-01',
  },
  {
    name: 'US Open / marquee sports package',
    category: 'event',
    city: 'New York', city_code: 'NYC', country: 'United States',
    program_name: 'Chase Ultimate Rewards',
    channel: 'Chase Experiences',
    points_required: 90000, cash_price_usd: 900,
    booking_url: 'https://www.chase.com/personal/credit-cards/experiences',
    notes: 'Seasonal. Compare against resale market before committing points at 1¢.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Louvre after-hours guided visit',
    category: 'tour',
    city: 'Paris', city_code: 'PAR', country: 'France',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    points_required: 45000, cash_price_usd: 380,
    booking_url: 'https://moments.marriottbonvoy.com/',
    notes: 'Recurring Moments listing; auction pricing varies by season.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Michelin bistro chef table for two',
    category: 'dining',
    city: 'Paris', city_code: 'PAR', country: 'France',
    program_name: 'Capital One Miles',
    channel: 'Capital One Dining',
    points_required: 45000, cash_price_usd: 450,
    booking_url: 'https://www.capitalonedining.com/',
    verified_at: '2026-07-01',
  },
  {
    name: 'West End premium seats (pair)',
    category: 'event',
    city: 'London', city_code: 'LON', country: 'United Kingdom',
    program_name: 'Amex Membership Rewards',
    channel: 'Amex Experiences',
    points_required: 35000, cash_price_usd: 350,
    booking_url: 'https://www.americanexpress.com/en-us/benefits/experiences/',
    verified_at: '2026-07-01',
  },
  {
    name: 'Formula 1 paddock weekend package',
    category: 'event',
    city: 'Singapore', city_code: 'SIN', country: 'Singapore',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    points_required: 350000, cash_price_usd: 4200,
    booking_url: 'https://moments.marriottbonvoy.com/',
    notes: 'Flagship Moments auction — 1.2¢/pt, and the access is genuinely unbuyable at face value.',
    verified_at: '2026-07-01',
  },
  {
    name: 'Rooftop omakase & skyline tasting',
    category: 'dining',
    city: 'Singapore', city_code: 'SIN', country: 'Singapore',
    program_name: 'World of Hyatt',
    channel: 'Hyatt FIND',
    points_required: 20000, cash_price_usd: 340,
    booking_url: 'https://world.hyatt.com/content/gp/en/rewards/find-experiences.html',
    verified_at: '2026-07-01',
  },
  {
    name: 'Desert conservation safari & dinner',
    category: 'tour',
    city: 'Dubai', city_code: 'DXB', country: 'United Arab Emirates',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    points_required: 55000, cash_price_usd: 500,
    booking_url: 'https://moments.marriottbonvoy.com/',
    verified_at: '2026-07-01',
  },
  {
    name: 'Spa day & thermal circuit for two',
    category: 'wellness',
    city: 'Dubai', city_code: 'DXB', country: 'United Arab Emirates',
    program_name: 'World of Hyatt',
    channel: 'Hyatt FIND',
    points_required: 15000, cash_price_usd: 260,
    booking_url: 'https://world.hyatt.com/content/gp/en/rewards/find-experiences.html',
    verified_at: '2026-07-01',
  },
  {
    name: 'Vineyard helicopter tour & tasting',
    category: 'tour',
    city: 'Barcelona', city_code: 'BCN', country: 'Spain',
    program_name: 'Amex Membership Rewards',
    channel: 'Amex Experiences',
    points_required: 65000, cash_price_usd: 620,
    booking_url: 'https://www.americanexpress.com/en-us/benefits/experiences/',
    verified_at: '2026-07-01',
  },
  {
    name: 'Colosseum underground private tour',
    category: 'tour',
    city: 'Rome', city_code: 'ROM', country: 'Italy',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    points_required: 40000, cash_price_usd: 340,
    booking_url: 'https://moments.marriottbonvoy.com/',
    verified_at: '2026-07-01',
  },
  {
    name: 'Sunset catamaran & reef snorkel',
    category: 'tour',
    city: 'Cancun', city_code: 'CUN', country: 'Mexico',
    program_name: 'World of Hyatt',
    channel: 'Hyatt FIND',
    points_required: 12000, cash_price_usd: 210,
    booking_url: 'https://world.hyatt.com/content/gp/en/rewards/find-experiences.html',
    verified_at: '2026-07-01',
  },
  {
    name: 'Cooking class & market tour for two',
    category: 'tour',
    city: 'Bangkok', city_code: 'BKK', country: 'Thailand',
    program_name: 'Marriott Bonvoy',
    channel: 'Marriott Bonvoy Moments',
    points_required: 20000, cash_price_usd: 160,
    booking_url: 'https://moments.marriottbonvoy.com/',
    verified_at: '2026-07-01',
  },
];

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log(`Seeding ${experiences.length} experiences...`);
  let ok = 0;
  for (const exp of experiences) {
    const { error } = await supabase.from('experiences').upsert(
      {
        name: exp.name,
        category: exp.category,
        city: exp.city ?? null,
        city_code: exp.city_code ?? null,
        country: exp.country ?? null,
        program_name: exp.program_name,
        channel: exp.channel,
        points_required: exp.points_required ?? null,
        cash_price_usd: exp.cash_price_usd ?? null,
        fixed_cpp: exp.fixed_cpp ?? null,
        booking_url: exp.booking_url ?? null,
        notes: exp.notes ?? null,
        verified_at: exp.verified_at,
        is_active: true,
      },
      { onConflict: 'name, program_name, city_code' }
    );
    if (error) {
      console.error(`  ✗ ${exp.name}: ${error.message}`);
    } else {
      ok++;
      console.log(`  ✓ ${exp.name}${exp.city ? ` (${exp.city})` : ''}`);
    }
  }
  console.log(`\nDone: ${ok}/${experiences.length} experiences seeded.`);
}

seed();
