import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Stripe Checkout session creation.
 *
 * Deliberately dependency-free (Stripe's REST API over fetch) so the repo
 * stays installable without the Stripe SDK, and returns a clear, actionable
 * error when keys aren't configured rather than a stack trace. Wire
 * STRIPE_SECRET_KEY and STRIPE_PRICE_ID to go live; see docs/API_KEYS.md.
 *
 * Note: subscription state is only ever set by the Stripe webhook, never by
 * this route. A user returning from Checkout doesn't prove payment cleared.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error:
          "Payments aren't configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable upgrades.",
        notConfigured: true,
      },
      { status: 503 }
    );
  }

  try {
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/upgrade?canceled=1`,
      client_reference_id: user.id,
      "subscription_data[metadata][user_id]": user.id,
      allow_promotion_codes: "true",
    });
    if (user.email) params.set("customer_email", user.email);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!res.ok) {
      console.error("Stripe checkout error:", await res.text());
      return NextResponse.json(
        { error: "Couldn't start checkout. Try again shortly." },
        { status: 502 }
      );
    }

    const session = (await res.json()) as { url?: string };
    if (!session.url) {
      return NextResponse.json({ error: "Checkout session had no URL." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout failed:", err);
    return NextResponse.json({ error: "Couldn't start checkout." }, { status: 500 });
  }
}
