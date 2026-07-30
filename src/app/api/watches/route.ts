import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Saved watches — the subscription hook for alerts. */
const watchSchema = z.object({
  kind: z.enum(["flight", "hotel", "program"]).default("flight"),
  origin: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  destination: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  cityCode: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  programId: z.string().uuid().optional(),
  cabin: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  targetCpp: z.number().min(0.1).max(20).optional(),
  maxPoints: z.number().int().min(1000).max(2_000_000).optional(),
  earliestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  latestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const MAX_WATCHES_FREE = Number(process.env.WATCH_FREE_LIMIT ?? 2);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("watches")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ watches: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = watchSchema.parse(await request.json());

    if (input.kind === "flight" && (!input.origin || !input.destination)) {
      return NextResponse.json(
        { error: "A flight watch needs both an origin and a destination." },
        { status: 400 }
      );
    }
    if (input.kind === "hotel" && !input.cityCode) {
      return NextResponse.json(
        { error: "A hotel watch needs a city code." },
        { status: 400 }
      );
    }
    if (input.kind === "program" && !input.programId) {
      return NextResponse.json(
        { error: "A program watch needs a program." },
        { status: 400 }
      );
    }
    if (!input.targetCpp && !input.maxPoints && input.kind !== "program") {
      return NextResponse.json(
        {
          error:
            "Set a target — either a cents-per-point threshold or a maximum points price — so we know when to tell you.",
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    if (profile?.subscription_tier !== "premium") {
      const { count } = await supabase
        .from("watches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);
      if ((count ?? 0) >= MAX_WATCHES_FREE) {
        return NextResponse.json(
          {
            error: `Free accounts can keep ${MAX_WATCHES_FREE} active watches. Upgrade for unlimited watches and daily alerts.`,
            upgrade: true,
          },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("watches")
      .insert({
        user_id: user.id,
        kind: input.kind,
        origin: input.origin ?? null,
        destination: input.destination ?? null,
        city_code: input.cityCode ?? null,
        program_id: input.programId ?? null,
        cabin: input.cabin,
        target_cpp: input.targetCpp ?? null,
        max_points: input.maxPoints ?? null,
        earliest_date: input.earliestDate ?? null,
        latest_date: input.latestDate ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("watch insert failed:", error);
      return NextResponse.json({ error: "Couldn't save that watch." }, { status: 500 });
    }
    return NextResponse.json({ watch: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("watch error:", error);
    return NextResponse.json({ error: "Couldn't save that watch." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // RLS scopes this to the owner; soft-delete keeps alert history coherent.
  const { error } = await supabase
    .from("watches")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Couldn't remove it." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
