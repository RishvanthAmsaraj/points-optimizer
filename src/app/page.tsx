import Link from "next/link";
import { PlaneGlyph } from "@/components/route-line";

const steps = [
  {
    title: "Log what you hold",
    body: "Pick your cards and type in your balances. No logins to your bank, no card numbers — ever.",
  },
  {
    title: "Name the trip",
    body: "Route, dates, cabin, seats. We search real award space and the live cash fare to compare against.",
  },
  {
    title: "Fly the playbook",
    body: "Exact transfers in order — including two-hop chains and split funding — with every risk flagged before you commit.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
          <div>
            <p className="animate-fade-up mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
              For people with more points than patience
            </p>
            <h1
              className="animate-fade-up font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Your points already know the way.
              <br />
              We draw the map.
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-lg text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Transfer chains, sweet spots, split funding across programs — the
              stuff that takes hobbyists a weekend on spreadsheets. Tell us what
              you hold and where you want to go; we hand you the exact playbook
              to book it.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-md bg-primary px-7 font-medium text-primary-foreground shadow-[0_0_32px_-8px_hsl(var(--primary)/0.6)] transition-colors hover:bg-primary/90"
              >
                Build my first playbook
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-md border border-input px-7 font-medium transition-colors hover:bg-accent"
              >
                See how it works
              </a>
            </div>
            <p
              className="animate-fade-up mt-4 text-sm text-muted-foreground"
              style={{ animationDelay: "300ms" }}
            >
              Free to start · No card numbers, no bank logins
            </p>
          </div>

          {/* Example playbook ticket */}
          <div
            className="animate-fade-up relative mx-auto w-full max-w-md"
            style={{ animationDelay: "200ms" }}
          >
            <div className="rounded-lg border bg-card p-6 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Example playbook
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary">
                  JFK <PlaneGlyph className="h-3 w-3" /> NRT
                </span>
              </div>
              <p className="font-display text-xl">
                Chase → Marriott → Alaska
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Business class · 1 passenger
              </p>

              <div className="mt-5 space-y-0">
                {[
                  "Transfer 153,000 Chase points to Marriott Bonvoy",
                  "Transfer 153,000 Marriott points to Alaska (+10,000 bonus miles)",
                  "Book the JFK → NRT award on Alaska",
                ].map((line, i, arr) => (
                  <div key={line} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < arr.length - 1 && (
                      <div
                        className="route-dash absolute bottom-0 left-[13px] top-8"
                        aria-hidden
                      />
                    )}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-card font-mono text-xs text-primary">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm">{line}</p>
                  </div>
                ))}
              </div>

              <div className="ticket-perforation mt-5 flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  Value captured
                </span>
                <span className="font-mono text-lg text-success">
                  1.16¢ / pt
                </span>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Illustrative example — your playbook is built from your balances
              and live award space.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl sm:text-4xl">
            Three stops between you and the seat.
          </h2>

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < steps.length - 1 && (
                  <div
                    className="route-dash-x absolute left-[calc(100%_-_1.5rem)] top-[18px] hidden w-12 md:block"
                    aria-hidden
                  />
                )}
                <span className="route-node">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Why not just a search tool
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Search tells you a seat exists. A playbook tells you how to
              take it.
            </h2>
          </div>
          <div className="space-y-6 text-muted-foreground">
            <p>
              Award search tools stop at &ldquo;there&rsquo;s space on
              Aeroplan.&rdquo; The hard part is what they skip: which of your
              currencies reaches Aeroplan, whether a two-hop chain through a
              hotel program beats it, whether combining two balances covers a
              shortfall, and which transfers you can&rsquo;t undo if the space
              disappears.
            </p>
            <p>
              We rank every route your points can take — portals included as
              the honest baseline — and flag the irreversible steps before you
              commit a single point. When a chain loses value, we say so, even
              when it&rsquo;s the one we found.
            </p>
            <p className="text-foreground">
              Your data stays yours: balances you typed, nothing more.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl">
            The seat is out there.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Two free playbooks a month. Takes about three minutes to log your
            balances.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center rounded-md bg-primary px-8 font-medium text-primary-foreground shadow-[0_0_32px_-8px_hsl(var(--primary)/0.6)] transition-colors hover:bg-primary/90"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Points Optimizer is an independent tool and is not affiliated with
            or endorsed by any bank, card issuer, airline, or hotel program.
            Award pricing, availability, and transfer rules change without
            notice — confirm award space with the airline before transferring
            points, as most transfers cannot be reversed. Nothing here is
            financial advice.
          </p>
        </div>
      </footer>
    </main>
  );
}
