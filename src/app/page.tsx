import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Points Optimizer</h1>
        <p className="text-xl mb-8">
          Maximize your credit card points and miles for travel redemptions.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-input bg-background px-6 py-3 hover:bg-accent hover:text-accent-foreground"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
