import { HTMLAttributes } from "react";

type Tone = "gold" | "neutral" | "success" | "warning";

const tones: Record<Tone, string> = {
  gold: "border-primary/40 bg-primary/10 text-primary",
  neutral: "border-border bg-secondary text-muted-foreground",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-300",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
