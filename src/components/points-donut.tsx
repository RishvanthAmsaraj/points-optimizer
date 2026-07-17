"use client";

/**
 * Hand-rolled SVG donut for the dashboard — points distribution by program.
 * No chart library: one dependency fewer, and the styling stays on-token.
 */

interface Slice {
  label: string;
  value: number;
}

const SLICE_COLORS = [
  "hsl(39 68% 64%)", // champagne
  "hsl(215 65% 62%)",
  "hsl(155 58% 55%)",
  "hsl(280 45% 65%)",
  "hsl(0 60% 65%)",
  "hsl(190 55% 55%)",
  "hsl(30 75% 55%)",
  "hsl(217 25% 55%)",
];

export function PointsDonut({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;

  const top = [...slices].sort((a, b) => b.value - a.value).slice(0, 7);
  const rest = total - top.reduce((s, x) => s + x.value, 0);
  const shown = rest > 0 ? [...top, { label: "Other", value: rest }] : top;

  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 160 160"
        className="h-44 w-44 shrink-0 -rotate-90"
        role="img"
        aria-label="Points distribution by program"
      >
        {shown.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const el = (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${Math.max(dash - 2.5, 0.001)} ${C - dash + 2.5}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <ul className="grid w-full grid-cols-1 gap-2 text-sm">
        {shown.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{s.label}</span>
            </span>
            <span className="font-mono text-foreground">
              {s.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
