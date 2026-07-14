import { createClient } from '@supabase/supabase-js';

// Credit cards data
const cards = [
  {
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    network: "Visa",
    annual_fee: 95,
    signup_bonus_points: 60000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 2, dining: 3, streaming: 0, groceries: 0, gas: 0, other: 1
    },
    transfer_partners: [
      "United MileagePlus", "Southwest Rapid Rewards", "JetBlue TrueBlue",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Iberia Plus", "Aer Lingus AerClub", "World of Hyatt",
      "Marriott Bonvoy", "IHG One Rewards"
    ]
  },
  {
    name: "Chase Sapphire Reserve",
    issuer: "Chase",
    network: "Visa",
    annual_fee: 550,
    signup_bonus_points: 60000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 3, dining: 3, streaming: 0, groceries: 0, gas: 0, other: 1
    },
    transfer_partners: [
      "United MileagePlus", "Southwest Rapid Rewards", "JetBlue TrueBlue",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Iberia Plus", "Aer Lingus AerClub", "World of Hyatt",
      "Marriott Bonvoy", "IHG One Rewards"
    ]
  },
  {
    name: "American Express Gold Card",
    issuer: "American Express",
    network: "American Express",
    annual_fee: 325,
    signup_bonus_points: 60000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 3, dining: 4, streaming: 0, groceries: 4, gas: 0, other: 1
    },
    transfer_partners: [
      "Delta SkyMiles", "Hilton Honors", "Marriott Bonvoy",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Etihad Guest", "Qatar Airways Privilege Club",
      "ANA Mileage Club", "Cathay Pacific Asia Miles", "Avianca LifeMiles"
    ]
  },
  {
    name: "American Express Platinum Card",
    issuer: "American Express",
    network: "American Express",
    annual_fee: 695,
    signup_bonus_points: 80000,
    signup_bonus_spend_required: 8000,
    category_multipliers: {
      travel: 5, dining: 1, streaming: 0, groceries: 0, gas: 0, other: 1
    },
    transfer_partners: [
      "Delta SkyMiles", "Hilton Honors", "Marriott Bonvoy",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Etihad Guest", "Qatar Airways Privilege Club",
      "ANA Mileage Club", "Cathay Pacific Asia Miles", "Avianca LifeMiles"
    ]
  },
  {
    name: "Citi Premier Card",
    issuer: "Citi",
    network: "Mastercard",
    annual_fee: 95,
    signup_bonus_points: 60000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 3, dining: 3, streaming: 0, groceries: 3, gas: 3, other: 1
    },
    transfer_partners: [
      "Air France-KLM Flying Blue", "Avianca LifeMiles",
      "Cathay Pacific Asia Miles", "Emirates Skywards",
      "Etihad Guest", "EVA Air Infinity MileageLands",
      "JetBlue TrueBlue", "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club", "Singapore Airlines KrisFlyer",
      "Thai Airways Royal Orchid Plus", "Turkish Airlines Miles&Smiles",
      "Virgin Atlantic Flying Club", "Wyndham Rewards"
    ]
  },
  {
    name: "Capital One Venture X",
    issuer: "Capital One",
    network: "Visa",
    annual_fee: 395,
    signup_bonus_points: 75000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 5, dining: 2, streaming: 0, groceries: 0, gas: 0, other: 2
    },
    transfer_partners: [
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Etihad Guest", "Qatar Airways Privilege Club",
      "Turkish Airlines Miles&Smiles", "Avianca LifeMiles",
      "Cathay Pacific Asia Miles", "EVA Air Infinity MileageLands",
      "Finnair Plus", "TAP Miles&Go"
    ]
  },
  {
    name: "Bilt World Elite Mastercard",
    issuer: "Bilt",
    network: "Mastercard",
    annual_fee: 0,
    signup_bonus_points: 0,
    signup_bonus_spend_required: 0,
    category_multipliers: {
      travel: 2, dining: 3, streaming: 0, groceries: 0, gas: 0, rent: 1, other: 1
    },
    transfer_partners: [
      "American Airlines AAdvantage", "United MileagePlus",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Cathay Pacific Asia Miles", "Turkish Airlines Miles&Smiles",
      "Iberia Plus", "Hawaiian Airlines HawaiianMiles",
      "Marriott Bonvoy", "Hyatt"
    ]
  }
];

// Loyalty programs data
const programs = [
  {
    name: "Chase Ultimate Rewards",
    type: "bank",
    alliance: null,
    point_valuation_cents: 2.05,
    transfer_partners: [
      "United MileagePlus", "Southwest Rapid Rewards", "JetBlue TrueBlue",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Iberia Plus", "Aer Lingus AerClub", "World of Hyatt",
      "Marriott Bonvoy", "IHG One Rewards"
    ],
    expiration_policy: "Points don't expire as long as account is open"
  },
  {
    name: "Amex Membership Rewards",
    type: "bank",
    alliance: null,
    point_valuation_cents: 2.00,
    transfer_partners: [
      "Delta SkyMiles", "Hilton Honors", "Marriott Bonvoy",
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Etihad Guest", "Qatar Airways Privilege Club",
      "ANA Mileage Club", "Cathay Pacific Asia Miles", "Avianca LifeMiles"
    ],
    expiration_policy: "Points don't expire, but forfeited if account closed"
  },
  {
    name: "Citi ThankYou Points",
    type: "bank",
    alliance: null,
    point_valuation_cents: 1.90,
    transfer_partners: [
      "Air France-KLM Flying Blue", "Avianca LifeMiles",
      "Cathay Pacific Asia Miles", "Emirates Skywards",
      "Etihad Guest", "EVA Air Infinity MileageLands",
      "JetBlue TrueBlue", "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club", "Singapore Airlines KrisFlyer",
      "Thai Airways Royal Orchid Plus", "Turkish Airlines Miles&Smiles",
      "Virgin Atlantic Flying Club", "Wyndham Rewards"
    ],
    expiration_policy: "Points expire 60 days after account closure"
  },
  {
    name: "Capital One Miles",
    type: "bank",
    alliance: null,
    point_valuation_cents: 1.85,
    transfer_partners: [
      "Air Canada Aeroplan", "British Airways Executive Club",
      "Air France-KLM Flying Blue", "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer", "Emirates Skywards",
      "Etihad Guest", "Qatar Airways Privilege Club",
      "Turkish Airlines Miles&Smiles", "Avianca LifeMiles",
      "Cathay Pacific Asia Miles", "EVA Air Infinity MileageLands",
      "Finnair Plus", "TAP Miles&Go"
    ],
    expiration_policy: "Points don't expire"
  },
  {
    name: "United MileagePlus",
    type: "airline",
    alliance: "Star Alliance",
    point_valuation_cents: 1.40,
    transfer_partners: [],
    expiration_policy: "Miles don't expire"
  },
  {
    name: "Air Canada Aeroplan",
    type: "airline",
    alliance: "Star Alliance",
    point_valuation_cents: 1.50,
    transfer_partners: [],
    expiration_policy: "18 months of inactivity"
  },
  {
    name: "Singapore Airlines KrisFlyer",
    type: "airline",
    alliance: "Star Alliance",
    point_valuation_cents: 1.30,
    transfer_partners: [],
    expiration_policy: "3 years from earning"
  },
  {
    name: "American Airlines AAdvantage",
    type: "airline",
    alliance: "Oneworld",
    point_valuation_cents: 1.50,
    transfer_partners: [],
    expiration_policy: "24 months of inactivity"
  },
  {
    name: "British Airways Executive Club",
    type: "airline",
    alliance: "Oneworld",
    point_valuation_cents: 1.25,
    transfer_partners: [],
    expiration_policy: "36 months of inactivity"
  },
  {
    name: "Delta SkyMiles",
    type: "airline",
    alliance: "SkyTeam",
    point_valuation_cents: 1.20,
    transfer_partners: [],
    expiration_policy: "Miles don't expire"
  },
  {
    name: "Air France-KLM Flying Blue",
    type: "airline",
    alliance: "SkyTeam",
    point_valuation_cents: 1.20,
    transfer_partners: [],
    expiration_policy: "24 months of inactivity"
  },
  {
    name: "World of Hyatt",
    type: "hotel",
    alliance: null,
    point_valuation_cents: 1.70,
    transfer_partners: [],
    expiration_policy: "24 months of inactivity"
  },
  {
    name: "Marriott Bonvoy",
    type: "hotel",
    alliance: null,
    point_valuation_cents: 0.80,
    transfer_partners: [],
    expiration_policy: "24 months of inactivity"
  },
  {
    name: "IHG One Rewards",
    type: "hotel",
    alliance: null,
    point_valuation_cents: 0.50,
    transfer_partners: [],
    expiration_policy: "12 months of inactivity"
  },
  {
    name: "Hilton Honors",
    type: "hotel",
    alliance: null,
    point_valuation_cents: 0.50,
    transfer_partners: [],
    expiration_policy: "15 months of inactivity"
  }
];

// Transfer rates data
const transferRates = [
  { from: "Chase Ultimate Rewards", to: "United MileagePlus", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "Air Canada Aeroplan", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "British Airways Executive Club", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "Air France-KLM Flying Blue", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "Virgin Atlantic Flying Club", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "Singapore Airlines KrisFlyer", ratio: 1.00, timing: "Same day" },
  { from: "Chase Ultimate Rewards", to: "Emirates Skywards", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "World of Hyatt", ratio: 1.00, timing: "Instant" },
  { from: "Chase Ultimate Rewards", to: "Marriott Bonvoy", ratio: 1.00, timing: "Same day" },
  { from: "Chase Ultimate Rewards", to: "IHG One Rewards", ratio: 1.00, timing: "Instant" },

  { from: "Amex Membership Rewards", to: "Delta SkyMiles", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Hilton Honors", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Marriott Bonvoy", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Air Canada Aeroplan", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "British Airways Executive Club", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Air France-KLM Flying Blue", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Virgin Atlantic Flying Club", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Singapore Airlines KrisFlyer", ratio: 1.00, timing: "Same day" },
  { from: "Amex Membership Rewards", to: "Emirates Skywards", ratio: 1.00, timing: "Instant" },
  { from: "Amex Membership Rewards", to: "Etihad Guest", ratio: 1.00, timing: "Same day" },
  { from: "Amex Membership Rewards", to: "Qatar Airways Privilege Club", ratio: 1.00, timing: "48 hours" },
  { from: "Amex Membership Rewards", to: "ANA Mileage Club", ratio: 1.00, timing: "48 hours" },
  { from: "Amex Membership Rewards", to: "Cathay Pacific Asia Miles", ratio: 1.00, timing: "48 hours" },
  { from: "Amex Membership Rewards", to: "Avianca LifeMiles", ratio: 1.00, timing: "Instant" },

  { from: "Citi ThankYou Points", to: "Air France-KLM Flying Blue", ratio: 1.00, timing: "Instant" },
  { from: "Citi ThankYou Points", to: "Avianca LifeMiles", ratio: 1.00, timing: "Instant" },
  { from: "Citi ThankYou Points", to: "Cathay Pacific Asia Miles", ratio: 1.00, timing: "24 hours" },
  { from: "Citi ThankYou Points", to: "Emirates Skywards", ratio: 1.00, timing: "Instant" },
  { from: "Citi ThankYou Points", to: "Etihad Guest", ratio: 1.00, timing: "Same day" },
  { from: "Citi ThankYou Points", to: "JetBlue TrueBlue", ratio: 1.00, timing: "Instant" },
  { from: "Citi ThankYou Points", to: "Qatar Airways Privilege Club", ratio: 1.00, timing: "48 hours" },
  { from: "Citi ThankYou Points", to: "Singapore Airlines KrisFlyer", ratio: 1.00, timing: "24 hours" },
  { from: "Citi ThankYou Points", to: "Turkish Airlines Miles&Smiles", ratio: 1.00, timing: "Same day" },
  { from: "Citi ThankYou Points", to: "Virgin Atlantic Flying Club", ratio: 1.00, timing: "Instant" },
  { from: "Citi ThankYou Points", to: "Wyndham Rewards", ratio: 1.00, timing: "Instant" },

  { from: "Capital One Miles", to: "Air Canada Aeroplan", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "British Airways Executive Club", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "Air France-KLM Flying Blue", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "Virgin Atlantic Flying Club", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "Singapore Airlines KrisFlyer", ratio: 1.00, timing: "Same day" },
  { from: "Capital One Miles", to: "Emirates Skywards", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "Qatar Airways Privilege Club", ratio: 1.00, timing: "48 hours" },
  { from: "Capital One Miles", to: "Turkish Airlines Miles&Smiles", ratio: 1.00, timing: "Same day" },
  { from: "Capital One Miles", to: "Avianca LifeMiles", ratio: 1.00, timing: "Instant" },
  { from: "Capital One Miles", to: "Cathay Pacific Asia Miles", ratio: 1.00, timing: "48 hours" },
];

async function seedAll() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables.');
    console.error('Create .env.local with:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🌱 Seeding database...\n');

  // 1. Seed loyalty programs
  console.log('📋 Seeding loyalty programs...');
  for (const program of programs) {
    const { error } = await supabase
      .from('loyalty_programs')
      .upsert(program, { onConflict: 'name' });
    if (error) console.error(`  ❌ ${program.name}:`, error.message);
    else console.log(`  ✓ ${program.name}`);
  }

  // 2. Seed credit cards
  console.log('\n💳 Seeding credit cards...');
  for (const card of cards) {
    const { error } = await supabase
      .from('cards')
      .upsert(card, { onConflict: 'name' });
    if (error) console.error(`  ❌ ${card.name}:`, error.message);
    else console.log(`  ✓ ${card.name}`);
  }

  // 3. Seed transfer rates (need to map names to IDs)
  console.log('\n🔄 Seeding transfer rates...');
  const { data: allPrograms, error: progError } = await supabase
    .from('loyalty_programs')
    .select('id, name');

  if (progError || !allPrograms) {
    console.error('❌ Error fetching programs:', progError);
    process.exit(1);
  }

  const programMap = new Map(allPrograms.map(p => [p.name, p.id]));

  for (const rate of transferRates) {
    const fromId = programMap.get(rate.from);
    const toId = programMap.get(rate.to);

    if (!fromId || !toId) {
      console.warn(`  ⚠️ Skipping ${rate.from} → ${rate.to}: program not found`);
      continue;
    }

    const { error } = await supabase
      .from('transfer_rates')
      .upsert({
        from_program_id: fromId,
        to_program_id: toId,
        ratio: rate.ratio,
        is_reversible: false,
        typical_timing: rate.timing,
        minimum_transfer: 1000,
        bonus_multiplier: 1.00
      }, { onConflict: 'from_program_id, to_program_id' });

    if (error) console.error(`  ❌ ${rate.from} → ${rate.to}:`, error.message);
    else console.log(`  ✓ ${rate.from} → ${rate.to}`);
  }

  console.log('\n✅ Done seeding database!');
}

seedAll();
