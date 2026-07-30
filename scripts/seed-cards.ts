import { createClient } from '@supabase/supabase-js';


interface CardSeed {
  name: string;
  issuer: string;
  network: string;
  annual_fee: number;
  signup_bonus_points: number;
  signup_bonus_spend_required: number;
  category_multipliers: Record<string, number>;
  transfer_partners: string[];
}

const cards: CardSeed[] = [
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
  },
  // ---------------------------------------------------------------------------
  // Expanded catalog. Annual fees and signup bonuses move constantly — these
  // are review-quarterly data-ops values (see docs/DATA_SOURCES.md), not
  // guarantees. Portal/transfer capability per issuer is what actually drives
  // the engine; the fee/bonus figures are display + card-recommendation only.
  // ---------------------------------------------------------------------------

  // Chase
  {
    name: "Chase Sapphire Reserve for Business",
    issuer: "Chase", network: "Visa", annual_fee: 795,
    signup_bonus_points: 200000, signup_bonus_spend_required: 30000,
    category_multipliers: { travel_portal: 8, advertising: 4, travel: 4, dining: 3, other: 1 },
    transfer_partners: ["Chase Ultimate Rewards"]
  },
  {
    name: "Ink Business Preferred",
    issuer: "Chase", network: "Visa", annual_fee: 95,
    signup_bonus_points: 90000, signup_bonus_spend_required: 8000,
    category_multipliers: { travel: 3, shipping: 3, advertising: 3, internet_phone: 3, other: 1 },
    transfer_partners: ["Chase Ultimate Rewards"]
  },
  {
    name: "Chase Freedom Unlimited",
    issuer: "Chase", network: "Visa", annual_fee: 0,
    signup_bonus_points: 20000, signup_bonus_spend_required: 500,
    category_multipliers: { dining: 3, drugstores: 3, travel_portal: 5, other: 1.5 },
    transfer_partners: ["Chase Ultimate Rewards"]
  },

  // American Express
  {
    name: "American Express Business Platinum",
    issuer: "American Express", network: "Amex", annual_fee: 895,
    signup_bonus_points: 150000, signup_bonus_spend_required: 20000,
    category_multipliers: { flights: 5, prepaid_hotels: 5, large_purchases: 1.5, other: 1 },
    transfer_partners: ["Amex Membership Rewards"]
  },
  {
    name: "American Express Green Card",
    issuer: "American Express", network: "Amex", annual_fee: 150,
    signup_bonus_points: 40000, signup_bonus_spend_required: 3000,
    category_multipliers: { travel: 3, transit: 3, dining: 3, other: 1 },
    transfer_partners: ["Amex Membership Rewards"]
  },

  // Citi
  {
    name: "Citi Strata Elite",
    issuer: "Citi", network: "Mastercard", annual_fee: 595,
    signup_bonus_points: 80000, signup_bonus_spend_required: 4000,
    category_multipliers: { hotels_cars_attractions: 12, dining: 6, flights: 1.5, other: 1 },
    transfer_partners: ["Citi ThankYou Points"]
  },
  {
    name: "Citi Double Cash",
    issuer: "Citi", network: "Mastercard", annual_fee: 0,
    signup_bonus_points: 20000, signup_bonus_spend_required: 1500,
    category_multipliers: { other: 2 },
    transfer_partners: ["Citi ThankYou Points"]
  },

  // Capital One
  {
    name: "Capital One Venture Rewards",
    issuer: "Capital One", network: "Visa", annual_fee: 95,
    signup_bonus_points: 75000, signup_bonus_spend_required: 4000,
    category_multipliers: { hotels_cars_portal: 5, other: 2 },
    transfer_partners: ["Capital One Miles"]
  },
  {
    name: "Capital One Spark Miles for Business",
    issuer: "Capital One", network: "Visa", annual_fee: 95,
    signup_bonus_points: 50000, signup_bonus_spend_required: 4500,
    category_multipliers: { hotels_cars_portal: 5, other: 2 },
    transfer_partners: ["Capital One Miles"]
  },

  // Bilt
  {
    name: "Bilt Cardholder (Rent Day)",
    issuer: "Bilt", network: "Mastercard", annual_fee: 0,
    signup_bonus_points: 0, signup_bonus_spend_required: 0,
    category_multipliers: { rent: 1, dining: 3, travel: 2, other: 1 },
    transfer_partners: ["Bilt Rewards"]
  },

  // Wells Fargo
  {
    name: "Wells Fargo Autograph Journey",
    issuer: "Wells Fargo", network: "Visa", annual_fee: 95,
    signup_bonus_points: 60000, signup_bonus_spend_required: 4000,
    category_multipliers: { hotels: 5, flights: 4, dining: 4, transit: 3, other: 1 },
    transfer_partners: ["Wells Fargo Rewards"]
  },
  {
    name: "Wells Fargo Autograph",
    issuer: "Wells Fargo", network: "Visa", annual_fee: 0,
    signup_bonus_points: 20000, signup_bonus_spend_required: 1000,
    category_multipliers: { dining: 3, travel: 3, gas: 3, transit: 3, streaming: 3, phone: 3, other: 1 },
    transfer_partners: ["Wells Fargo Rewards"]
  },

  // Bank of America
  {
    name: "Bank of America Premium Rewards Elite",
    issuer: "Bank of America", network: "Visa", annual_fee: 550,
    signup_bonus_points: 75000, signup_bonus_spend_required: 5000,
    category_multipliers: { travel: 2, dining: 2, other: 1.5 },
    transfer_partners: []
  },

  // U.S. Bank
  {
    name: "U.S. Bank Altitude Reserve",
    issuer: "U.S. Bank", network: "Visa", annual_fee: 400,
    signup_bonus_points: 50000, signup_bonus_spend_required: 4500,
    category_multipliers: { mobile_wallet: 3, travel: 3, other: 1 },
    transfer_partners: []
  },

  // Barclays / co-brands worth modeling because they hold transferable-adjacent value
  {
    name: "Barclays AAdvantage Aviator Red",
    issuer: "Barclays", network: "Mastercard", annual_fee: 99,
    signup_bonus_points: 60000, signup_bonus_spend_required: 1,
    category_multipliers: { american_airlines: 2, other: 1 },
    transfer_partners: ["American Airlines AAdvantage"]
  },
  {
    name: "World of Hyatt Credit Card",
    issuer: "Chase", network: "Visa", annual_fee: 95,
    signup_bonus_points: 30000, signup_bonus_spend_required: 3000,
    category_multipliers: { hyatt: 4, dining: 2, transit: 2, fitness: 2, other: 1 },
    transfer_partners: ["World of Hyatt"]
  },
  {
    name: "Marriott Bonvoy Boundless",
    issuer: "Chase", network: "Visa", annual_fee: 95,
    signup_bonus_points: 60000, signup_bonus_spend_required: 3000,
    category_multipliers: { marriott: 6, grocery_gas_dining: 3, other: 2 },
    transfer_partners: ["Marriott Bonvoy"]
  },
  {
    name: "Hilton Honors Surpass",
    issuer: "American Express", network: "Amex", annual_fee: 150,
    signup_bonus_points: 130000, signup_bonus_spend_required: 3000,
    category_multipliers: { hilton: 12, dining_grocery_gas: 6, other: 3 },
    transfer_partners: ["Hilton Honors"]
  },
  {
    name: "IHG One Rewards Premier",
    issuer: "Chase", network: "Mastercard", annual_fee: 99,
    signup_bonus_points: 140000, signup_bonus_spend_required: 3000,
    category_multipliers: { ihg: 10, travel_dining: 5, other: 3 },
    transfer_partners: ["IHG One Rewards"]
  },
  {
    name: "United Explorer Card",
    issuer: "Chase", network: "Visa", annual_fee: 95,
    signup_bonus_points: 50000, signup_bonus_spend_required: 3000,
    category_multipliers: { united: 2, dining: 2, hotels: 2, other: 1 },
    transfer_partners: ["United MileagePlus"]
  },
  {
    name: "Delta SkyMiles Reserve",
    issuer: "American Express", network: "Amex", annual_fee: 650,
    signup_bonus_points: 60000, signup_bonus_spend_required: 5000,
    category_multipliers: { delta: 3, other: 1 },
    transfer_partners: ["Delta SkyMiles"]
  },
  {
    name: "Alaska Airlines Visa Signature",
    issuer: "Bank of America", network: "Visa", annual_fee: 95,
    signup_bonus_points: 70000, signup_bonus_spend_required: 3000,
    category_multipliers: { alaska: 3, other: 1 },
    transfer_partners: ["Alaska Airlines Atmos Rewards"]
  },
  {
    name: "Southwest Rapid Rewards Priority",
    issuer: "Chase", network: "Visa", annual_fee: 149,
    signup_bonus_points: 50000, signup_bonus_spend_required: 1000,
    category_multipliers: { southwest: 3, other: 1 },
    transfer_partners: ["Southwest Rapid Rewards"]
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
