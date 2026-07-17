import { createClient } from '@supabase/supabase-js';

interface TransferRateSeed {
  from_program: string;
  to_program: string;
  /** Destination units received per 1 source unit (permanent rate). */
  ratio: number;
  is_reversible: boolean;
  typical_timing: string;
  minimum_transfer: number;
  /** Temporary promo multiplier only (e.g. 1.30 during a 30% bonus). */
  bonus_multiplier: number;
  /** Block bonus, e.g. Marriott: +5,000 per 60,000 transferred. */
  block_size?: number;
  block_bonus?: number;
  /** Transfer increment (defaults to 1000). */
  increment?: number;
}

const transferRates: TransferRateSeed[] = [
  // Chase UR transfers
  { from_program: "Chase Ultimate Rewards", to_program: "United MileagePlus", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Air Canada Aeroplan", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "British Airways Executive Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Air France-KLM Flying Blue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Virgin Atlantic Flying Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Singapore Airlines KrisFlyer", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Emirates Skywards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Iberia Plus", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Aer Lingus AerClub", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Southwest Rapid Rewards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "JetBlue TrueBlue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "World of Hyatt", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "Marriott Bonvoy", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Chase Ultimate Rewards", to_program: "IHG One Rewards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },

  // Amex MR transfers
  { from_program: "Amex Membership Rewards", to_program: "Delta SkyMiles", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  // 1:2 is Hilton's PERMANENT published rate — it belongs in ratio, not
  // bonus_multiplier (which is reserved for temporary promos).
  { from_program: "Amex Membership Rewards", to_program: "Hilton Honors", ratio: 2.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Marriott Bonvoy", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Air Canada Aeroplan", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "British Airways Executive Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Air France-KLM Flying Blue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Virgin Atlantic Flying Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Singapore Airlines KrisFlyer", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Emirates Skywards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Etihad Guest", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Qatar Airways Privilege Club", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "ANA Mileage Club", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Cathay Pacific Asia Miles", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Amex Membership Rewards", to_program: "Avianca LifeMiles", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },

  // Citi TYP transfers
  { from_program: "Citi ThankYou Points", to_program: "Air France-KLM Flying Blue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Avianca LifeMiles", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Cathay Pacific Asia Miles", ratio: 1.00, is_reversible: false, typical_timing: "24 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Emirates Skywards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Etihad Guest", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "EVA Air Infinity MileageLands", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "JetBlue TrueBlue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Qantas Frequent Flyer", ratio: 1.00, is_reversible: false, typical_timing: "24 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Qatar Airways Privilege Club", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Singapore Airlines KrisFlyer", ratio: 1.00, is_reversible: false, typical_timing: "24 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Thai Airways Royal Orchid Plus", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Turkish Airlines Miles&Smiles", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Virgin Atlantic Flying Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Citi ThankYou Points", to_program: "Wyndham Rewards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },

  // Capital One transfers
  { from_program: "Capital One Miles", to_program: "Air Canada Aeroplan", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "British Airways Executive Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Air France-KLM Flying Blue", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Virgin Atlantic Flying Club", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Singapore Airlines KrisFlyer", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Emirates Skywards", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Etihad Guest", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Qatar Airways Privilege Club", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Turkish Airlines Miles&Smiles", ratio: 1.00, is_reversible: false, typical_timing: "Same day", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Avianca LifeMiles", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Cathay Pacific Asia Miles", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "EVA Air Infinity MileageLands", ratio: 1.00, is_reversible: false, typical_timing: "48 hours", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "Finnair Plus", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },
  { from_program: "Capital One Miles", to_program: "TAP Miles&Go", ratio: 1.00, is_reversible: false, typical_timing: "Instant", minimum_transfer: 1000, bonus_multiplier: 1.00 },

  // ---------------------------------------------------------------------------
  // Marriott Bonvoy -> airlines: THE second hop that makes multi-hop chains
  // possible (e.g. Chase UR -> Marriott -> Alaska is historically the only
  // path from Chase points to Alaska miles). Standard rate is 3:1 with a
  // 5,000-mile bonus for every 60,000 points transferred, so 60k Marriott
  // -> 25k airline miles. It's a lossy hop — the engine flags it — but for
  // certain sweet-spot redemptions it still wins.
  // VERIFY BEFORE PRODUCTION: Marriott's partner list and rates change;
  // check marriott.com/loyalty and set up the data-ops review cadence in
  // docs/DATA_SOURCES.md.
  // ---------------------------------------------------------------------------
  { from_program: "Marriott Bonvoy", to_program: "Alaska Airlines Atmos Rewards", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "American Airlines AAdvantage", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "Delta SkyMiles", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "United MileagePlus", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "Air Canada Aeroplan", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "Singapore Airlines KrisFlyer", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
  { from_program: "Marriott Bonvoy", to_program: "British Airways Executive Club", ratio: 0.3333, is_reversible: false, typical_timing: "3-5 days", minimum_transfer: 3000, bonus_multiplier: 1.00, block_size: 60000, block_bonus: 5000, increment: 3000 },
];

async function seedTransferRates() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables. Check .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Seeding transfer rates...');

  // First, get all programs to map names to IDs
  const { data: programs, error: programsError } = await supabase
    .from('loyalty_programs')
    .select('id, name');

  if (programsError || !programs) {
    console.error('Error fetching programs:', programsError);
    process.exit(1);
  }

  const programMap = new Map(programs.map(p => [p.name, p.id]));

  for (const rate of transferRates) {
    const fromId = programMap.get(rate.from_program);
    const toId = programMap.get(rate.to_program);

    if (!fromId || !toId) {
      console.warn(`Skipping ${rate.from_program} → ${rate.to_program}: program not found`);
      continue;
    }

    const { error } = await supabase
      .from('transfer_rates')
      .upsert({
        from_program_id: fromId,
        to_program_id: toId,
        ratio: rate.ratio,
        is_reversible: rate.is_reversible,
        typical_timing: rate.typical_timing,
        minimum_transfer: rate.minimum_transfer,
        bonus_multiplier: rate.bonus_multiplier,
        block_size: rate.block_size ?? 0,
        block_bonus: rate.block_bonus ?? 0,
        increment: rate.increment ?? 1000
      }, { onConflict: 'from_program_id, to_program_id' });

    if (error) {
      console.error(`Error seeding ${rate.from_program} → ${rate.to_program}:`, error);
    } else {
      console.log(`✓ ${rate.from_program} → ${rate.to_program}`);
    }
  }

  console.log('Done seeding transfer rates!');
}

seedTransferRates();
