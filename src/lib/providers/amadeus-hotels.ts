import { CashQuote, HotelCashProvider, HotelSearchQuery } from "./types";

/**
 * Amadeus hotel cash pricing (Self-Service).
 *
 * Two-step flow per their docs: Hotel List by city -> Hotel Search v3 offers
 * for those hotelIds. Like all Amadeus Self-Service APIs it carries a free
 * monthly request quota in test AND production. Used only as the cash
 * comparison baseline for hotel award playbooks; degrades to null (no cpp
 * shown) on any failure. Verify response fields against current docs before
 * production — parsing below is defensive.
 */
export class AmadeusHotelCashProvider implements HotelCashProvider {
  readonly name = "amadeus";
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"
  ) {}

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 30_000) {
      return this.token.value;
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
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  async getHotelCashPrice(q: HotelSearchQuery): Promise<CashQuote | null> {
    try {
      const token = await this.getToken();
      const listRes = await fetch(
        `${this.baseUrl}/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(
          q.cityCode
        )}&radius=20&radiusUnit=KM`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
      );
      if (!listRes.ok) return null;
      const list = (await listRes.json()) as { data?: Array<{ hotelId?: string }> };
      const hotelIds = (list.data ?? [])
        .map((h) => h.hotelId)
        .filter((id): id is string => !!id)
        .slice(0, 20);
      if (hotelIds.length === 0) return null;

      const params = new URLSearchParams({
        hotelIds: hotelIds.join(","),
        checkInDate: q.checkIn,
        checkOutDate: q.checkOut,
        adults: String(Math.max(1, Math.ceil(q.guests / q.rooms))),
        roomQuantity: String(q.rooms),
        currency: "USD",
        bestRateOnly: "true",
      });
      const offersRes = await fetch(
        `${this.baseUrl}/v3/shopping/hotel-offers?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
      );
      if (!offersRes.ok) return null;
      const offers = (await offersRes.json()) as {
        data?: Array<{ offers?: Array<{ price?: { total?: string } }> }>;
      };
      const totals = (offers.data ?? [])
        .flatMap((h) => h.offers ?? [])
        .map((o) => Number(o.price?.total))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (totals.length === 0) return null;
      // Median keeps one luxury outlier from skewing the comparison.
      totals.sort((a, b) => a - b);
      const median = totals[Math.floor(totals.length / 2)];
      return { priceUsd: Math.round(median), source: "amadeus" };
    } catch (err) {
      console.error("Amadeus hotel price lookup failed:", err);
      return null;
    }
  }
}
