"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-slate-400/60 bg-slate-300 p-0.5 shadow-inner transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[checked]:border-primary data-[checked]:bg-primary",
        "dark:border-slate-500 dark:bg-slate-600 dark:data-[checked]:border-primary dark:data-[checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out",
          "translate-x-0.5 group-data-[checked]:translate-x-[1.35rem]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
