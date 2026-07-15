import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Your Points Dashboard</h1>

        {/* Points Portfolio */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Points Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">Chase Ultimate Rewards</p>
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Add your balance</p>
            </div>
            <div className="rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">Amex Membership Rewards</p>
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Add your balance</p>
            </div>
            <div className="rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Add balances to see value</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90">
              Search Awards
            </button>
            <button className="rounded-lg border border-input bg-background px-6 py-3 hover:bg-accent hover:text-accent-foreground">
              Build Playbook
            </button>
            <button className="rounded-lg border border-input bg-background px-6 py-3 hover:bg-accent hover:text-accent-foreground">
              Add Points
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-muted-foreground">No recent activity. Start by searching for awards or building your first playbook.</p>
        </section>
      </div>
    </main>
  );
}
