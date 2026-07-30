import { createClient } from '@supabase/supabase-js';


interface ProgramSeed {
  name: string;
  type: string;
  alliance: string | null;
  point_valuation_cents: number;
  transfer_partners: string[];
  expiration_policy: string;
}

const programs: ProgramSeed[] = [
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
  },

  // -------------------------------------------------------------------------
  // Programs below were referenced by seed-transfer-rates.ts but missing from
  // this file, which caused those transfer edges to be silently skipped at
  // seed time. Valuations are industry-consensus estimates (cents/point) —
  // review quarterly as part of data ops (see docs/DATA_SOURCES.md).
  // -------------------------------------------------------------------------
  { name: "Virgin Atlantic Flying Club", type: "airline", alliance: "SkyTeam", point_valuation_cents: 1.40, transfer_partners: [], expiration_policy: "36 months of inactivity" },
  { name: "Emirates Skywards", type: "airline", alliance: null, point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "3 years from earning" },
  { name: "Iberia Plus", type: "airline", alliance: "oneworld", point_valuation_cents: 1.30, transfer_partners: [], expiration_policy: "36 months of inactivity" },
  { name: "Aer Lingus AerClub", type: "airline", alliance: null, point_valuation_cents: 1.30, transfer_partners: [], expiration_policy: "36 months of inactivity" },
  { name: "Southwest Rapid Rewards", type: "airline", alliance: null, point_valuation_cents: 1.35, transfer_partners: [], expiration_policy: "Points don't expire" },
  { name: "JetBlue TrueBlue", type: "airline", alliance: null, point_valuation_cents: 1.30, transfer_partners: [], expiration_policy: "Points don't expire" },
  { name: "Etihad Guest", type: "airline", alliance: null, point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "18 months of inactivity" },
  { name: "Qatar Airways Privilege Club", type: "airline", alliance: "oneworld", point_valuation_cents: 1.30, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "ANA Mileage Club", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.40, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "Cathay Pacific Asia Miles", type: "airline", alliance: "oneworld", point_valuation_cents: 1.30, transfer_partners: [], expiration_policy: "18 months of inactivity" },
  { name: "Avianca LifeMiles", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.50, transfer_partners: [], expiration_policy: "12 months of inactivity" },
  { name: "EVA Air Infinity MileageLands", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "Qantas Frequent Flyer", type: "airline", alliance: "oneworld", point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "18 months of inactivity" },
  { name: "Thai Airways Royal Orchid Plus", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.10, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "Turkish Airlines Miles&Smiles", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.40, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "Wyndham Rewards", type: "hotel", alliance: null, point_valuation_cents: 1.00, transfer_partners: [], expiration_policy: "4 years from earning" },
  { name: "Finnair Plus", type: "airline", alliance: "oneworld", point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "TAP Miles&Go", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "36 months from earning" },
  // Alaska renamed Mileage Plan to Atmos Rewards in 2025. High-value program;
  // notably reachable from Chase/Amex ONLY via the Marriott multi-hop.
  { name: "Alaska Airlines Atmos Rewards", type: "airline", alliance: "oneworld", point_valuation_cents: 1.45, transfer_partners: [], expiration_policy: "Miles don't expire (account must stay active)" },
  { name: "Bilt Rewards", type: "bank", alliance: null, point_valuation_cents: 1.80, transfer_partners: [], expiration_policy: "Points don't expire while account is active" },
  { name: "Wells Fargo Rewards", type: "bank", alliance: null, point_valuation_cents: 1.20, transfer_partners: [], expiration_policy: "Points don't expire while account is open" },
  { name: "Choice Privileges", type: "hotel", alliance: null, point_valuation_cents: 0.60, transfer_partners: [], expiration_policy: "18 months of inactivity" },
  { name: "Accor Live Limitless", type: "hotel", alliance: null, point_valuation_cents: 2.20, transfer_partners: [], expiration_policy: "12 months of inactivity" },
  { name: "Aeromexico Rewards", type: "airline", alliance: "SkyTeam", point_valuation_cents: 1.10, transfer_partners: [], expiration_policy: "24 months of inactivity" },
  { name: "Copa ConnectMiles", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.10, transfer_partners: [], expiration_policy: "36 months from earning" },
  { name: "Air India Maharaja Club", type: "airline", alliance: "Star Alliance", point_valuation_cents: 1.00, transfer_partners: [], expiration_policy: "36 months of inactivity" }
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
