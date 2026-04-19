import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "glass flex min-h-[120px] w-full resize-y rounded-xl border border-white/25 bg-white/45 px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-glass-sm backdrop-blur-xl transition-colors placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
