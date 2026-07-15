import { createClient } from "@/lib/supabase/server";
import { buildOptimizationPlaybook } from "@/lib/optimization/engine";
import { NextResponse } from "next/server";
import { z } from "zod";

const playbookSchema = z.object({
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  passengers: z.number().min(1).max(9).default(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile || profile.subscription_tier === "free") {
      return NextResponse.json(
        { error: "Premium feature. Please upgrade to generate playbooks." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = playbookSchema.parse(body);

    // Fetch user's points balances
    const { data: balances } = await supabase
      .from("points_balances")
      .select("*")
      .eq("user_id", user.id);

    // Fetch all loyalty programs
    const { data: programs } = await supabase
      .from("loyalty_programs")
      .select("*");

    // Fetch transfer rates
    const { data: transferRates } = await supabase
      .from("transfer_rates")
      .select("*");

    // TODO: Integrate with award search API (AwardWallet, etc.)
    // For now, return mock data
    const mockAwardOptions = [
      {
        program: programs?.find((p) => p.name === "Air Canada Aeroplan") || {
          id: "mock",
          name: "Air Canada Aeroplan",
          type: "airline",
        },
        milesRequired: 55000,
        taxesAndFees: 47,
        cashPrice: 2500,
        airline: "Air Canada",
        routing: ["JFK", "YYZ", "NRT"],
        stops: 1,
        duration: 780,
      },
    ];

    const playbook = await buildOptimizationPlaybook(
      balances || [],
      programs || [],
      transferRates || [],
      validated,
      mockAwardOptions as any
    );

    // Save playbook to database
    const { data: savedPlaybook, error: saveError } = await supabase
      .from("playbooks")
      .insert({
        user_id: user.id,
        query: `${validated.origin} to ${validated.destination}`,
        steps: playbook.best.steps,
        best_option: {
          name: playbook.best.name,
          totalPoints: playbook.best.totalPoints,
          totalCash: playbook.best.totalCash,
          cpp: playbook.best.cpp,
          savings: playbook.best.savings,
        },
        alternatives: playbook.alternatives.map((alt) => ({
          name: alt.name,
          totalPoints: alt.totalPoints,
          totalCash: alt.totalCash,
          cpp: alt.cpp,
          savings: alt.savings,
        })),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving playbook:", saveError);
    }

    return NextResponse.json({
      playbook: savedPlaybook || playbook,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Playbook generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate playbook" },
      { status: 500 }
    );
  }
}
