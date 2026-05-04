"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  bars?: number;
  playing?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  label?: string;
  intensity?: "low" | "medium" | "high";
  levels?: number[];
  fill?: boolean;
}

const variantColor: Record<string, string> = {
  default: "bg-primary",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const variantGlow: Record<string, string> = {
  default: "shadow-[0_0_6px_var(--primary)]",
  success: "shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  warning: "shadow-[0_0_6px_rgba(245,158,11,0.5)]",
  danger: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
};

const intensityRange = {
  low: { min: 8, max: 28 },
  medium: { min: 10, max: 40 },
  high: { min: 14, max: 48 },
};

const CONTAINER_HEIGHT = 52;

export function Waveform({ bars = 24, playing = true, variant = "default", label, intensity = "medium", levels, fill = false, className, ...props }: WaveformProps) {
  const range = intensityRange[intensity];
  const heights = Array.from({ length: bars }, (_, index) => {
    const level = Math.min(1, Math.max(0, levels?.[index] ?? 0));
    return playing ? (fill ? 8 + 92 * level : range.min + (range.max - range.min) * level) : 4;
  });

  return (
    <div data-slot="tron-waveform" className={cn("relative overflow-hidden", fill ? "flex h-full flex-col p-0" : "p-3", className)} {...props}>

      {label && (
        <div className={cn("flex items-center justify-between font-mono", fill ? "px-5 pb-1 pt-4" : "mb-2")}>
          <span className="text-[10px] uppercase tracking-widest text-foreground/80">{label}</span>
          <span className={cn("text-[9px] uppercase tracking-widest", playing ? "animate-pulse text-green-500" : "text-foreground/40")}>{playing ? "LIVE" : "IDLE"}</span>
        </div>
      )}

      <div className={cn("flex items-end justify-center gap-[2px]", fill && "min-h-0 flex-1 px-0 pb-0")} style={{ height: fill ? undefined : CONTAINER_HEIGHT }}>
        {heights.map((height, index) => (
          <div
            key={index}
            className={cn(fill ? "min-w-0 flex-1" : "w-1.5", "rounded-t-sm", variantColor[variant], playing && variantGlow[variant])}
            style={{
              height: fill ? `${Math.max(3, height)}%` : Math.max(2, height),
              opacity: playing ? (fill ? 0.42 + (height / 100) * 0.58 : 0.45 + (height / CONTAINER_HEIGHT) * 0.55) : 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
