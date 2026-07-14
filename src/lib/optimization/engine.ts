import { Database } from "@/lib/database.types";

type PointsBalance = Database["public"]["Tables"]["points_balances"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type TransferRate = Database["public"]["Tables"]["transfer_rates"]["Row"];

interface TravelQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  passengers?: number;
}

interface AwardOption {
  program: LoyaltyProgram;
  milesRequired: number;
  taxesAndFees: number;
  cashPrice: number;
  airline: string;
  routing: string[];
  stops: number;
  duration: number;
}

interface PaymentPath {
  id: string;
  name: string;
  steps: PathStep[];
  totalPoints: number;
  totalCash: number;
  cpp: number;
  savings: number;
  complexity: number;
  speed: number;
}

interface PathStep {
  type: "transfer" | "book" | "portal";
  description: string;
  details: Record<string, unknown>;
}

interface PlaybookResult {
  best: PaymentPath;
  alternatives: PaymentPath[];
  query: TravelQuery;
}

/**
 * Build an optimization playbook for a given travel query
 */
export async function buildOptimizationPlaybook(
  userBalances: PointsBalance[],
  programs: LoyaltyProgram[],
  transferRates: TransferRate[],
  query: TravelQuery,
  awardOptions: AwardOption[]
): Promise<PlaybookResult> {
  // Step 1: Build all possible payment paths
  const paths: PaymentPath[] = [];

  for (const award of awardOptions) {
    // Direct portal booking path
    const portalPath = buildPortalPath(award, userBalances, programs);
    if (portalPath) paths.push(portalPath);

    // Transfer partner paths
    const transferPaths = buildTransferPaths(
      award,
      userBalances,
      programs,
      transferRates
    );
    paths.push(...transferPaths);
  }

  // Step 2: Score and rank paths
  const scoredPaths = paths
    .map((path) => ({
      ...path,
      score: calculateScore(path),
    }))
    .sort((a, b) => b.score - a.score);

  // Step 3: Return top result + alternatives
  return {
    best: scoredPaths[0],
    alternatives: scoredPaths.slice(1, 3),
    query,
  };
}

/**
 * Build a direct portal booking path (e.g., Chase Travel Portal)
 */
function buildPortalPath(
  award: AwardOption,
  userBalances: PointsBalance[],
  programs: LoyaltyProgram[]
): PaymentPath | null {
  // Find bank programs with portal booking
  const bankPrograms = programs.filter((p) => p.type === "bank");

  for (const bankProgram of bankPrograms) {
    const balance = userBalances.find(
      (b) => b.program_id === bankProgram.id
    );
    if (!balance || balance.balance < award.milesRequired) continue;

    // Check if portal value is competitive
    const portalValue = getPortalValue(bankProgram.name);
    const portalPointsNeeded = Math.ceil(award.cashPrice / portalValue);

    if (balance.balance >= portalPointsNeeded) {
      return {
        id: `portal-${bankProgram.id}-${award.program.id}`,
        name: `${bankProgram.name} Travel Portal`,
        steps: [
          {
            type: "portal",
            description: `Book through ${bankProgram.name} Travel Portal`,
            details: {
              portalUrl: getPortalUrl(bankProgram.name),
              pointsNeeded: portalPointsNeeded,
              cashPrice: award.cashPrice,
            },
          },
        ],
        totalPoints: portalPointsNeeded,
        totalCash: 0,
        cpp: portalValue,
        savings: 0, // Baseline
        complexity: 1,
        speed: 5, // Fastest - instant booking
      };
    }
  }

  return null;
}

/**
 * Build all possible transfer partner paths
 */
function buildTransferPaths(
  award: AwardOption,
  userBalances: PointsBalance[],
  programs: LoyaltyProgram[],
  transferRates: TransferRate[]
): PaymentPath[] {
  const paths: PaymentPath[] = [];

  // Find transfer rates that lead to the award program
  const relevantRates = transferRates.filter(
    (rate) => rate.to_program_id === award.program.id
  );

  for (const rate of relevantRates) {
    const fromProgram = programs.find((p) => p.id === rate.from_program_id);
    if (!fromProgram) continue;

    const balance = userBalances.find(
      (b) => b.program_id === fromProgram.id
    );
    if (!balance) continue;

    // Calculate points needed after transfer ratio
    const pointsNeeded = Math.ceil(
      award.milesRequired / rate.ratio / rate.bonus_multiplier
    );

    if (balance.balance >= pointsNeeded) {
      const cpp =
        award.cashPrice > 0
          ? (award.cashPrice - award.taxesAndFees) / pointsNeeded
          : 0;

      paths.push({
        id: `transfer-${fromProgram.id}-${award.program.id}`,
        name: `${fromProgram.name} → ${award.program.name}`,
        steps: [
          {
            type: "transfer",
            description: `Transfer ${pointsNeeded.toLocaleString()} points from ${fromProgram.name} to ${award.program.name}`,
            details: {
              fromProgram: fromProgram.name,
              toProgram: award.program.name,
              pointsToTransfer: pointsNeeded,
              ratio: rate.ratio,
              bonusMultiplier: rate.bonus_multiplier,
              timing: rate.typical_timing,
              transferUrl: getTransferUrl(fromProgram.name),
            },
          },
          {
            type: "book",
            description: `Book award on ${award.program.name}`,
            details: {
              program: award.program.name,
              milesRequired: award.milesRequired,
              taxesAndFees: award.taxesAndFees,
              bookingUrl: getBookingUrl(award.program.name),
              flight: {
                airline: award.airline,
                routing: award.routing,
                stops: award.stops,
                duration: award.duration,
              },
            },
          },
        ],
        totalPoints: pointsNeeded,
        totalCash: award.taxesAndFees,
        cpp,
        savings: calculateSavings(cpp, pointsNeeded, award.cashPrice),
        complexity: 2,
        speed: rate.typical_timing?.includes("instant") ? 4 : 3,
      });
    }
  }

  return paths;
}

/**
 * Calculate overall score for a payment path
 */
function calculateScore(path: PaymentPath): number {
  const cppWeight = 0.4;
  const savingsWeight = 0.3;
  const simplicityWeight = 0.2;
  const speedWeight = 0.1;

  // Normalize CPP (assume 0.5¢ to 5¢ range)
  const normalizedCpp = Math.min(path.cpp / 5, 1);

  // Normalize savings (assume $0 to $2000 range)
  const normalizedSavings = Math.min(path.savings / 2000, 1);

  // Simplicity (inverse of complexity, 1-5 scale)
  const simplicity = 1 / path.complexity;

  // Speed (1-5 scale)
  const normalizedSpeed = path.speed / 5;

  return (
    normalizedCpp * cppWeight +
    normalizedSavings * savingsWeight +
    simplicity * simplicityWeight +
    normalizedSpeed * speedWeight
  );
}

/**
 * Calculate savings vs. baseline (portal booking at 1¢/point)
 */
function calculateSavings(
  cpp: number,
  pointsUsed: number,
  cashPrice: number
): number {
  const baselineValue = pointsUsed * 0.01; // 1¢ per point baseline
  const actualValue = cpp * pointsUsed;
  return actualValue - baselineValue;
}

// Helper functions for URLs
function getPortalValue(programName: string): number {
  const values: Record<string, number> = {
    "Chase Ultimate Rewards": 0.0125,
    "Amex Membership Rewards": 0.01,
    "Citi ThankYou Points": 0.01,
    "Capital One Miles": 0.01,
  };
  return values[programName] || 0.01;
}

function getPortalUrl(programName: string): string {
  const urls: Record<string, string> = {
    "Chase Ultimate Rewards": "https://www.chase.com/travel",
    "Amex Membership Rewards": "https://www.amextravel.com",
    "Citi ThankYou Points": "https://thankyou.com",
    "Capital One Miles": "https://www.capitalone.com/travel",
  };
  return urls[programName] || "";
}

function getTransferUrl(programName: string): string {
  const urls: Record<string, string> = {
    "Chase Ultimate Rewards": "https://www.chase.com/ultimaterewards",
    "Amex Membership Rewards": "https://www.americanexpress.com/rewards",
    "Citi ThankYou Points": "https://thankyou.com",
    "Capital One Miles": "https://www.capitalone.com/rewards",
  };
  return urls[programName] || "";
}

function getBookingUrl(programName: string): string {
  const urls: Record<string, string> = {
    "United MileagePlus": "https://www.united.com",
    "American Airlines AAdvantage": "https://www.aa.com",
    "Delta SkyMiles": "https://www.delta.com",
    "Air Canada Aeroplan": "https://www.aeroplan.com",
    "Air France-KLM Flying Blue": "https://www.flyingblue.com",
  };
  return urls[programName] || "";
}
