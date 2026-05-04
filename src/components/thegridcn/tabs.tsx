"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="tabs" className={cn("grid gap-4", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="tabs-list" role="tablist" className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function TabsTrigger({ active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button data-slot="tabs-trigger" role="tab" aria-selected={active} className={cn(active && "is-active", className)} {...props} />;
}

export function TabsContent({ active = true, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { active?: boolean }) {
  if (!active) return null;
  return <div data-slot="tabs-content" role="tabpanel" className={className} {...props} />;
}
