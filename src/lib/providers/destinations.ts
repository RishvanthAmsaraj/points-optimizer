/**
 * Destination catalog for reverse search ("where can I go?").
 *
 * Reverse search has a quota problem: evaluating every airport on earth would
 * burn a provider's daily allowance in one click. So we search a curated set
 * of high-intent award destinations, filtered by the user's region and budget
 * before any provider call is made. Each entry pairs the primary airport with
 * the hotel city code so one destination can price a whole trip.
 *
 * Extend freely — the cost is one cached award search per destination per
 * (date, cabin), and award_cache makes repeats free for 6 hours.
 */

export type Region =
  | "north_america"
  | "latin_america"
  | "europe"
  | "asia"
  | "oceania"
  | "middle_east"
  | "africa";

export interface Destination {
  airport: string;
  cityCode: string;
  city: string;
  country: string;
  region: Region;
  /** Rough one-way distance band from the US East Coast, for sanity ordering. */
  longHaul: boolean;
  /** One-line reason this destination is worth points, shown in results. */
  hook: string;
}

export const DESTINATIONS: Destination[] = [
  // Asia
  { airport: "NRT", cityCode: "TYO", city: "Tokyo", country: "Japan", region: "asia", longHaul: true, hook: "The classic long-haul business-class redemption; Hyatt's Tokyo portfolio is deep." },
  { airport: "ICN", cityCode: "SEL", city: "Seoul", country: "South Korea", region: "asia", longHaul: true, hook: "Strong Star Alliance award access and reasonable hotel award pricing." },
  { airport: "SIN", cityCode: "SIN", city: "Singapore", country: "Singapore", region: "asia", longHaul: true, hook: "KrisFlyer sweet spots and a dense luxury hotel market." },
  { airport: "HKG", cityCode: "HKG", city: "Hong Kong", country: "China", region: "asia", longHaul: true, hook: "oneworld hub with frequent premium-cabin award space." },
  { airport: "BKK", cityCode: "BKK", city: "Bangkok", country: "Thailand", region: "asia", longHaul: true, hook: "Low hotel award pricing makes points go unusually far." },
  { airport: "DPS", cityCode: "DPS", city: "Bali", country: "Indonesia", region: "asia", longHaul: true, hook: "Category-low resorts turn modest hotel balances into long stays." },

  // Europe
  { airport: "LHR", cityCode: "LON", city: "London", country: "United Kingdom", region: "europe", longHaul: true, hook: "Widest award availability from North America — watch the surcharges." },
  { airport: "CDG", cityCode: "PAR", city: "Paris", country: "France", region: "europe", longHaul: true, hook: "Flying Blue promo awards regularly undercut every other program." },
  { airport: "FCO", cityCode: "ROM", city: "Rome", country: "Italy", region: "europe", longHaul: true, hook: "Strong shoulder-season award space and Moments experiences." },
  { airport: "BCN", cityCode: "BCN", city: "Barcelona", country: "Spain", region: "europe", longHaul: true, hook: "Iberia Plus off-peak pricing is one of the best transatlantic values." },
  { airport: "LIS", cityCode: "LIS", city: "Lisbon", country: "Portugal", region: "europe", longHaul: true, hook: "TAP award space plus low hotel categories." },
  { airport: "AMS", cityCode: "AMS", city: "Amsterdam", country: "Netherlands", region: "europe", longHaul: true, hook: "SkyTeam hub; Flying Blue monthly promos apply here often." },
  { airport: "IST", cityCode: "IST", city: "Istanbul", country: "Turkey", region: "europe", longHaul: true, hook: "Turkish Miles&Smiles is a value outlier if you can reach the program." },
  { airport: "ATH", cityCode: "ATH", city: "Athens", country: "Greece", region: "europe", longHaul: true, hook: "Seasonal award space; island hops are cheap on points." },

  // Middle East / Africa
  { airport: "DXB", cityCode: "DXB", city: "Dubai", country: "UAE", region: "middle_east", longHaul: true, hook: "Premium-cabin product quality per point is hard to beat." },
  { airport: "DOH", cityCode: "DOH", city: "Doha", country: "Qatar", region: "middle_east", longHaul: true, hook: "Qsuite availability via oneworld partners." },
  { airport: "CPT", cityCode: "CPT", city: "Cape Town", country: "South Africa", region: "africa", longHaul: true, hook: "Long-haul award value is exceptional relative to cash fares." },
  { airport: "MRU", cityCode: "MRU", city: "Mauritius", country: "Mauritius", region: "africa", longHaul: true, hook: "Resort awards priced far below cash rates." },

  // Oceania
  { airport: "SYD", cityCode: "SYD", city: "Sydney", country: "Australia", region: "oceania", longHaul: true, hook: "Ultra-long-haul where business-class awards beat cash by the widest margin." },
  { airport: "AKL", cityCode: "AKL", city: "Auckland", country: "New Zealand", region: "oceania", longHaul: true, hook: "Star Alliance space opens well in advance." },
  { airport: "NAN", cityCode: "NAN", city: "Nadi", country: "Fiji", region: "oceania", longHaul: true, hook: "Island resorts with strong hotel award value." },

  // Latin America
  { airport: "MEX", cityCode: "MEX", city: "Mexico City", country: "Mexico", region: "latin_america", longHaul: false, hook: "Short-haul award pricing plus a great hotel market." },
  { airport: "CUN", cityCode: "CUN", city: "Cancún", country: "Mexico", region: "latin_america", longHaul: false, hook: "Cheap award flights and all-inclusive point redemptions." },
  { airport: "GRU", cityCode: "SAO", city: "São Paulo", country: "Brazil", region: "latin_america", longHaul: true, hook: "Overnight business-class awards at reasonable rates." },
  { airport: "LIM", cityCode: "LIM", city: "Lima", country: "Peru", region: "latin_america", longHaul: false, hook: "LifeMiles pricing makes this a bargain from most US hubs." },
  { airport: "SJO", cityCode: "SJO", city: "San José", country: "Costa Rica", region: "latin_america", longHaul: false, hook: "Frequent saver space in winter." },

  // North America
  { airport: "YVR", cityCode: "YVR", city: "Vancouver", country: "Canada", region: "north_america", longHaul: false, hook: "Aeroplan short-haul pricing is excellent." },
  { airport: "YYZ", cityCode: "YTO", city: "Toronto", country: "Canada", region: "north_america", longHaul: false, hook: "Cheap partner awards and an easy first redemption." },
  { airport: "HNL", cityCode: "HNL", city: "Honolulu", country: "United States", region: "north_america", longHaul: false, hook: "Hawaii awards are the highest-demand domestic redemption." },
  { airport: "SFO", cityCode: "SFO", city: "San Francisco", country: "United States", region: "north_america", longHaul: false, hook: "Domestic saver space plus a strong Hyatt footprint." },
  { airport: "MIA", cityCode: "MIA", city: "Miami", country: "United States", region: "north_america", longHaul: false, hook: "Cheap domestic awards and high cash fares in season." },
  { airport: "LAX", cityCode: "LAX", city: "Los Angeles", country: "United States", region: "north_america", longHaul: false, hook: "Easy award access from nearly every program." },
];

export const REGION_LABELS: Record<Region, string> = {
  north_america: "North America",
  latin_america: "Latin America",
  europe: "Europe",
  asia: "Asia",
  oceania: "Oceania",
  middle_east: "Middle East",
  africa: "Africa",
};
