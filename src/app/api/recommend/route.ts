import { createClient } from "@/lib/supabase/server";
import {
  RECOMMENDATION_DISCLOSURE,
  recommendCards,
} from "@/lib/optimization/card-recommendations";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Card recommendations for a specific shortfall.
 *
 * Called only after a plan comes up short, with the program and gap the user
 * actually needs — never as a standalone offers feed.
 */
const recommendSchema = z.object({
  programName: z.string().min(1).max(80),
  gapPoints: z.number().int().min(1).max(2_000_000),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = recommendSchema.parse(await request.json());

    const [
      { data: programs },
      { data: transferRates },
      { data: allCards },
      { data: userCards },
    ] = await Promise.all([
      supabase.from("loyalty_programs").select("*"),
      supabase.from("transfer_rates").select("*"),
      supabase.from("cards").select("*").eq("is_active", true),
      supabase
        .from("user_cards")
        .select("card_id")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const targetProgram = (programs ?? []).find((p) => p.name === input.programName);
    if (!targetProgram) {
      return NextResponse.json({ error: "Unknown program." }, { status: 400 });
    }

    const recommendations = recommendCards({
      targetProgram,
      gapPoints: input.gapPoints,
      allCards: allCards ?? [],
      heldCardIds: (userCards ?? []).map((c) => c.card_id),
      programs: programs ?? [],
      transferRates: transferRates ?? [],
    });

    return NextResponse.json({
      recommendations,
      disclosure: RECOMMENDATION_DISCLOSURE,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("recommend error:", error);
    return NextResponse.json({ error: "Couldn't build recommendations." }, { status: 500 });
  }
}
