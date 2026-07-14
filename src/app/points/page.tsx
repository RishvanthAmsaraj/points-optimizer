"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: balancesData } = await supabase
      .from("points_balances")
      .select("*, loyalty_programs(*)")
      .order("balance", { ascending: false });

    const { data: programsData } = await supabase
      .from("loyalty_programs")
      .select("*")
      .order("name");

    setBalances(balancesData || []);
    setPrograms(programsData || []);
    setLoading(false);
  }

  async function addBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!newBalance.program_id || !newBalance.balance) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("points_balances").upsert({
      user_id: user.user.id,
      program_id: newBalance.program_id,
      balance: parseInt(newBalance.balance),
    }, { onConflict: "user_id, program_id" });

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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Your Points Portfolio</h1>

        {/* Total Value Card */}
        <div className="rounded-lg border p-6 mb-8 bg-primary/5">
          <p className="text-sm text-muted-foreground">Total Estimated Value</p>
          <p className="text-4xl font-bold">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Across {balances.length} programs
          </p>
        </div>

        {/* Add Balance Form */}
        <div className="rounded-lg border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Points Balance</h2>
          <form onSubmit={addBalance} className="flex gap-4">
            <select
              value={newBalance.program_id}
              onChange={(e) => setNewBalance({ ...newBalance, program_id: e.target.value })}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
              required
            >
              <option value="">Select Program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Balance"
              value={newBalance.balance}
              onChange={(e) => setNewBalance({ ...newBalance, balance: e.target.value })}
              className="w-40 rounded-md border border-input bg-background px-3 py-2"
              required
              min="0"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Add
            </button>
          </form>
        </div>

        {/* Balances List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Balances</h2>
          {balances.length === 0 ? (
            <p className="text-muted-foreground">No balances added yet. Add your first points balance above.</p>
          ) : (
            balances.map((balance) => {
              const valuation = balance.loyalty_programs.point_valuation_cents || 1;
              const value = balance.balance * (valuation / 100);

              return (
                <div
                  key={balance.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{balance.loyalty_programs.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {balance.balance.toLocaleString()} points
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {valuation}¢ per point
                      </p>
                    </div>
                    <button
                      onClick={() => deleteBalance(balance.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
