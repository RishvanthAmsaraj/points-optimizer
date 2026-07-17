/**
 * The signature element: playbook steps rendered as stops on a flight path.
 * A dashed vertical route connects numbered nodes; the final stop gets the
 * plane glyph. Used on /playbook and echoed on the landing page.
 */
import { ReactNode } from "react";

export function RouteStop({
  index,
  isLast = false,
  children,
}: {
  index: number;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <div className="route-dash absolute left-[17px] top-9 bottom-0" aria-hidden />
      )}
      <div className="route-node">{isLast ? <PlaneGlyph /> : index + 1}</div>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </div>
  );
}

export function PlaneGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M21.5 15.5v-2l-8.5-5V3a1.5 1.5 0 0 0-3 0v5.5l-8.5 5v2l8.5-2.5v5l-2.5 2v1.5l4-1 4 1V20l-2.5-2v-5l8.5 2.5Z" />
    </svg>
  );
}
