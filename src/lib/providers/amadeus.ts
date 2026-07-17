import { AwardSearchQuery, CashPriceProvider, CashQuote } from "./types";

/**
 * Amadeus Self-Service API adapter for cash fares.
 *
 * We need a real cash price to compute cents-per-point honestly — without
 * it, "savings" numbers are fiction. Amadeus Flight Offers Search is the
 * cheapest legitimate source: free test tier (test.api.amadeus.com, capped
 * monthly quota, slightly stale data), pay-as-you-go production tier.
 * Sign up at https://developers.amadeus.com
 *
 * Set AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET, and AMADEUS_BASE_URL to
 * https://api.amadeus.com for production (defaults to the test host).
 */

const CABIN_MAP = {
  economy: "ECONOMY",
  premium_economy: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
} as const;

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class AmadeusCashPriceProvider implements CashPriceProvider {
  readonly name = "amadeus";
  private tokenCache: TokenCache | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"
  ) {}

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 30_000) {
      return this.tokenCache.token;
    }
    const res = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  async getCashPrice(q: AwardSearchQuery): Promise<CashQuote | null> {
    try {
      const token = await this.getToken();
      const params = new URLSearchParams({
        originLocationCode: q.origin,
        destinationLocationCode: q.destination,
        departureDate: q.departureDate,
        adults: String(1), // per-passenger price; engine multiplies by pax
        travelClass: CABIN_MAP[q.cabin],
        currencyCode: "USD",
        max: "5",
      });
      if (q.returnDate) params.set("returnDate", q.returnDate);

      const res = await fetch(
        `${this.baseUrl}/v2/shopping/flight-offers?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!res.ok) {
        console.error(`Amadeus search error ${res.status}`);
        return null;
      }

      const payload = (await res.json()) as {
        data?: Array<{ price?: { grandTotal?: string } }>;
      };
      const prices = (payload.data ?? [])
        .map((o) => Number(o.price?.grandTotal))
        .filter((p) => Number.isFinite(p) && p > 0);

      if (prices.length === 0) return null;
      return { priceUsd: Math.min(...prices), source: "amadeus" };
    } catch (err) {
      console.error("Amadeus cash price lookup failed:", err);
      return null; // cash price is enhancement, not requirement — degrade gracefully
    }
  }
}
