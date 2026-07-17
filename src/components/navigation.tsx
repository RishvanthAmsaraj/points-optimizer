"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { PlaneGlyph } from "@/components/route-line";

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/dashboard" as Route, label: "Dashboard" },
  { href: "/points" as Route, label: "Points" },
  { href: "/cards" as Route, label: "Cards" },
  { href: "/playbook" as Route, label: "Playbook" },
];

export function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 text-primary">
            <PlaneGlyph className="h-4 w-4" />
          </span>
          <span className="font-display text-lg tracking-tight">
            Points Optimizer
          </span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-border/70 px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {(user ? navItems : []).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  pathname === item.href
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={signOut}
                className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
