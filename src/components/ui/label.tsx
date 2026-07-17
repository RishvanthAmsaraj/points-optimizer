import { LabelHTMLAttributes } from "react";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}
      {...props}
    />
  );
}
