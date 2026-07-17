import { LoginForm } from "@/components/auth/login-form";
import { PlaneGlyph } from "@/components/route-line";

export default function LoginPage() {
  return (
    <div className="hero-glow flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 text-primary">
              <PlaneGlyph className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl">Welcome aboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to see what your points can really do.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          No card numbers, no bank logins — just balances you type yourself.
        </p>
      </div>
    </div>
  );
}
