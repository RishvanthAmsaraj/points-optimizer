"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface LoyaltyProgram {
  id: string;
  name: string;
  type: string;
  point_valuation_cents: number | null;
}

interface PointsBalance {
  id: string;
  program_id: string;
  balance: number;
  loyalty_programs: LoyaltyProgram;
}

export default function PointsPage() {
  const [balances, setBalances] = useState<PointsBalance[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBalance, setNewBalance] = useState({ program_id: "", balance: "" });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: balancesData } = await supabase
      .from("points_balances")
      .select("*, loyalty_programs(*)")
      .order("balance", { ascending: false });

    const { data: programsData } = await supabase
      .from("loyalty_programs")
      .select("*")
      .order("name");

    setBalances((balancesData as unknown as PointsBalance[]) || []);
    setPrograms(programsData || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!newBalance.program_id || !newBalance.balance) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("points_balances").upsert(
      {
        user_id: user.user.id,
        program_id: newBalance.program_id,
        balance: parseInt(newBalance.balance),
      },
      { onConflict: "user_id, program_id" }
    );

    if (!error) {
      setNewBalance({ program_id: "", balance: "" });
      fetchData();
    }
  }

  async function deleteBalance(id: string) {
    const { error } = await supabase.from("points_balances").delete().eq("id", id);
    if (!error) fetchData();
  }

  const totalValue = balances.reduce((sum, b) => {
    const valuation = b.loyalty_programs.point_valuation_cents || 1;
    return sum + b.balance * (valuation / 100);
  }, 0);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
          <div className="mt-8 h-32 animate-pulse rounded-lg bg-secondary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Points
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          What you&rsquo;re holding
        </h1>

        <Card className="mt-8 border-primary/30">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Total estimated value
            </p>
            <p className="mt-2 font-mono text-4xl text-success">
              $
              {totalValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              across {balances.length} program{balances.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-xl">Add a balance</h2>
            <form
              onSubmit={addBalance}
              className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
            >
              <div>
                <Label htmlFor="program">Program</Label>
                <Select
                  id="program"
                  value={newBalance.program_id}
                  onChange={(e) =>
                    setNewBalance({ ...newBalance, program_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  placeholder="120000"
                  value={newBalance.balance}
                  onChange={(e) =>
                    setNewBalance({ ...newBalance, balance: e.target.value })
                  }
                  required
                  min="0"
                  className="font-mono"
                />
              </div>
              <Button type="submit">Add balance</Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="font-display text-xl">Your balances</h2>
          {balances.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              Nothing logged yet. Add your first balance above — the playbook
              engine can only route points it knows about.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {balances.map((balance) => {
                const valuation =
                  balance.loyalty_programs.point_valuation_cents || 1;
                const value = balance.balance * (valuation / 100);
                return (
                  <Card key={balance.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {balance.loyalty_programs.name}
                        </p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {balance.balance.toLocaleString()} points
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono font-semibold">
                            $
                            {value.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {valuation}¢ / pt
                          </p>
                        </div>
                        <button
                          onClick={() => deleteBalance(balance.id)}
                          className="text-sm text-destructive transition-colors hover:text-destructive/80"
                        >
                          Remove
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
