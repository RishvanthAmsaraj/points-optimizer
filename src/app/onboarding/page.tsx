"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PlaneGlyph } from "@/components/route-line";

interface Program {
  id: string;
  name: string;
  type: string;
}

/**
 * First-run setup. The engine is useless without balances, so onboarding's
 * only job is getting a home airport and at least one balance in — fast, with
 * an obvious skip.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [homeAirport, setHomeAirport] = useState("");
  const [entries, setEntries] = useState<Array<{ programId: string; balance: string }>>([
    { programId: "", balance: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("loyalty_programs")
      .select("id, name, type")
      .order("type")
      .order("name")
      .then(({ data }) => setPrograms(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const rows = entries
      .filter((e) => e.programId && Number(e.balance) > 0)
      .map((e) => ({
        user_id: user.id,
        program_id: e.programId,
        balance: Math.floor(Number(e.balance)),
      }));

    if (rows.length > 0) {
      const { error: balErr } = await supabase
        .from("points_balances")
        .upsert(rows, { onConflict: "user_id, program_id" });
      if (balErr) {
        setError("Couldn't save those balances. You can add them on the Points page.");
        setSaving(false);
        return;
      }
    }

    await supabase
      .from("profiles")
      .update({
        home_airport: homeAirport || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    router.push("/dashboard");
  }

  const banks = programs.filter((p) => p.type === "bank");
  const others = programs.filter((p) => p.type !== "bank");

  return (
    <main className="hero-glow flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 text-primary">
            <PlaneGlyph className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl sm:text-3xl">
            Two minutes and you&rsquo;re flying
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Step {step} of 2 · no card numbers, ever
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 1 ? (
              <>
                <h2 className="font-display text-xl">Where do you usually fly from?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&rsquo;ll use it as the default origin for searches and watches.
                </p>
                <div className="mt-4 max-w-xs">
                  <Label htmlFor="home">Home airport</Label>
                  <Input id="home" placeholder="JFK" className="font-mono" maxLength={3}
                    pattern="[A-Za-z]{3}" value={homeAirport}
                    onChange={(e) => setHomeAirport(e.target.value.toUpperCase())} />
                </div>
                <div className="mt-6 flex gap-2">
                  <Button onClick={() => setStep(2)}>Next</Button>
                  <Button variant="ghost" onClick={() => setStep(2)}>Skip</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl">What points do you have?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with your transferable bank currencies — those unlock the
                  most options. Rough numbers are fine.
                </p>
                <div className="mt-4 space-y-3">
                  {entries.map((entry, i) => (
                    <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
                      <Select value={entry.programId}
                        onChange={(e) => {
                          const next = [...entries];
                          next[i] = { ...next[i], programId: e.target.value };
                          setEntries(next);
                        }}>
                        <option value="">Select program</option>
                        <optgroup label="Bank / transferable">
                          {banks.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Airline & hotel">
                          {others.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </optgroup>
                      </Select>
                      <Input type="number" placeholder="120000" min={0} className="font-mono"
                        value={entry.balance}
                        onChange={(e) => {
                          const next = [...entries];
                          next[i] = { ...next[i], balance: e.target.value };
                          setEntries(next);
                        }} />
                    </div>
                  ))}
                </div>
                <button type="button"
                  onClick={() => setEntries([...entries, { programId: "", balance: "" }])}
                  className="mt-3 text-sm text-primary hover:underline">
                  + Add another program
                </button>

                {error && (
                  <p className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={finish} disabled={saving}>
                    {saving ? "Saving…" : "Finish setup"}
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button variant="ghost" onClick={finish} disabled={saving}>
                    Skip for now
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
