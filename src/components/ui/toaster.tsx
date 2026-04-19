"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-white/25 bg-white/75 text-foreground shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-[oklch(0.22_0.04_258/0.92)]",
          title: "font-medium",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
