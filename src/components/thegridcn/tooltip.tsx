"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="tooltip" className={cn("relative inline-flex", className)} {...props}>{children}</span>;
}

export function TooltipTrigger({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="tooltip-trigger" className={cn("inline-flex", className)} {...props} />;
}

export function TooltipContent({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="tooltip-content" className={cn("pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap opacity-0 transition-opacity duration-150 [data-slot=tooltip]:hover:opacity-100 [data-slot=tooltip]:focus-within:opacity-100", className)} {...props} />;
}
