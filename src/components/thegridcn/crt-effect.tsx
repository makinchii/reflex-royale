"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CRTEffectProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "light" | "medium" | "heavy";
  animated?: boolean;
  spacing?: number;
  colored?: boolean;
}

export function CRTEffect({ children, className, intensity = "medium", animated = true, spacing = 3, colored = false, ...props }: CRTEffectProps) {
  const opacityMap = {
    light: 0.08,
    medium: 0.15,
    heavy: 0.25,
  };

  const lineColor = colored ? `color-mix(in oklch, var(--primary) ${opacityMap[intensity] * 100}%, transparent)` : `rgba(0, 0, 0, ${opacityMap[intensity]})`;

  return (
    <div className={cn("crt-effect relative overflow-hidden", className)} {...props}>
      {children}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent ${spacing}px, ${lineColor} ${spacing}px, ${lineColor} ${spacing * 2}px)`,
        }}
      />
      <div className="crt-effect__flicker pointer-events-none absolute inset-0 z-10 opacity-[0.025]" />
      {animated ? <div className="crt-effect__sweep pointer-events-none absolute left-0 right-0 z-20 h-px" /> : null}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.34)_100%)]" />
    </div>
  );
}
