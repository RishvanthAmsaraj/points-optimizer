import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`flex h-11 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm focus:border-primary/60 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
