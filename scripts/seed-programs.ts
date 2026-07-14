import { createClient } from '@supabase/supabase-js';

const programs = [
  // Bank Programs
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
      "ANA Mileage Club", "Cathay Pacific Asia Miles",
      "Avianca LifeMiles"
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
  // Airlines - Star Alliance
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
  // Airlines - Oneworld
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
  // Airlines - SkyTeam
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
  // Hotels
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

async function seedPrograms() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables. Check .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Seeding loyalty programs...');

  for (const program of programs) {
    const { error } = await supabase
      .from('loyalty_programs')
      .upsert(program, { onConflict: 'name' });

    if (error) {
      console.error(`Error seeding ${program.name}:`, error);
    } else {
      console.log(`✓ ${program.name}`);
    }
  }

  console.log('Done seeding programs!');
}

seedPrograms();
