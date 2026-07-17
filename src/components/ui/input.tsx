import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-11 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
