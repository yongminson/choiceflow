import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "glass flex h-11 w-full rounded-xl border border-white/25 bg-white/45 px-4 py-2 text-[15px] text-foreground shadow-glass-sm backdrop-blur-xl transition-colors placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
