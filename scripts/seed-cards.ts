import { createClient } from '@supabase/supabase-js';

const cards = [
  {
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    network: "Visa",
    annual_fee: 95,
    signup_bonus_points: 60000,
    signup_bonus_spend_required: 4000,
    category_multipliers: {
      travel: 2,
      dining: 3,
      streaming: 0,
      groceries: 0,
      gas: 0,
      other: 1
    },
    transfer_partners: [
      "United MileagePlus",
      "Southwest Rapid Rewards",
      "JetBlue TrueBlue",
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Iberia Plus",
      "Aer Lingus AerClub",
      "World of Hyatt",
      "Marriott Bonvoy",
      "IHG One Rewards"
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
      travel: 3,
      dining: 3,
      streaming: 0,
      groceries: 0,
      gas: 0,
      other: 1
    },
    transfer_partners: [
      "United MileagePlus",
      "Southwest Rapid Rewards",
      "JetBlue TrueBlue",
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Iberia Plus",
      "Aer Lingus AerClub",
      "World of Hyatt",
      "Marriott Bonvoy",
      "IHG One Rewards"
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
      travel: 3,
      dining: 4,
      streaming: 0,
      groceries: 4,
      gas: 0,
      other: 1
    },
    transfer_partners: [
      "Delta SkyMiles",
      "Hilton Honors",
      "Marriott Bonvoy",
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Etihad Guest",
      "Qatar Airways Privilege Club",
      "ANA Mileage Club",
      "Cathay Pacific Asia Miles",
      "Avianca LifeMiles"
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
      travel: 5,
      dining: 1,
      streaming: 0,
      groceries: 0,
      gas: 0,
      other: 1
    },
    transfer_partners: [
      "Delta SkyMiles",
      "Hilton Honors",
      "Marriott Bonvoy",
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Etihad Guest",
      "Qatar Airways Privilege Club",
      "ANA Mileage Club",
      "Cathay Pacific Asia Miles",
      "Avianca LifeMiles"
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
      travel: 3,
      dining: 3,
      streaming: 0,
      groceries: 3,
      gas: 3,
      other: 1
    },
    transfer_partners: [
      "Air France-KLM Flying Blue",
      "Avianca LifeMiles",
      "Cathay Pacific Asia Miles",
      "Emirates Skywards",
      "Etihad Guest",
      "EVA Air Infinity MileageLands",
      "JetBlue TrueBlue",
      "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club",
      "Singapore Airlines KrisFlyer",
      "Thai Airways Royal Orchid Plus",
      "Turkish Airlines Miles&Smiles",
      "Virgin Atlantic Flying Club",
      "Wyndham Rewards"
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
      travel: 5,
      dining: 2,
      streaming: 0,
      groceries: 0,
      gas: 0,
      other: 2
    },
    transfer_partners: [
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Etihad Guest",
      "Qatar Airways Privilege Club",
      "Turkish Airlines Miles&Smiles",
      "Avianca LifeMiles",
      "Cathay Pacific Asia Miles",
      "EVA Air Infinity MileageLands",
      "Finnair Plus",
      "TAP Miles&Go"
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
      travel: 2,
      dining: 3,
      streaming: 0,
      groceries: 0,
      gas: 0,
      rent: 1,
      other: 1
    },
    transfer_partners: [
      "American Airlines AAdvantage",
      "United MileagePlus",
      "Air Canada Aeroplan",
      "British Airways Executive Club",
      "Air France-KLM Flying Blue",
      "Virgin Atlantic Flying Club",
      "Singapore Airlines KrisFlyer",
      "Emirates Skywards",
      "Cathay Pacific Asia Miles",
      "Turkish Airlines Miles&Smiles",
      "Iberia Plus",
      "Hawaiian Airlines HawaiianMiles",
      "Marriott Bonvoy",
      "Hyatt"
    ]
  }
];

async function seedCards() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables. Check .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Seeding credit cards...');

  for (const card of cards) {
    const { error } = await supabase
      .from('cards')
      .upsert(card, { onConflict: 'name' });

    if (error) {
      console.error(`Error seeding ${card.name}:`, error);
    } else {
      console.log(`✓ ${card.name}`);
    }
  }

  console.log('Done seeding cards!');
}

seedCards();
