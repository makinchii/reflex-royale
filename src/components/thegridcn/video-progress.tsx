"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface VideoProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  currentTime?: string;
  endTime?: string;
  progress?: number;
  markers?: { position: number; label?: string }[];
}

export function VideoProgress({ currentTime = "00:00", endTime = "00:00", progress = 0, markers = [], className, ...props }: VideoProgressProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div data-slot="video-progress" className={cn("font-mono", className)} {...props}>
      <div className="relative h-1.5 w-full overflow-hidden bg-muted/30">
        <div className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/80" style={{ width: `${safeProgress}%` }} />
        <div data-slot="tron-progress-indicator" className="absolute top-0 h-full w-0.5 bg-foreground shadow-[0_0_12px_var(--primary)]" style={{ left: `${safeProgress}%` }} />
        {markers.map((marker, index) => (
          <div key={`${marker.position}-${index}`} className="absolute top-0 h-full w-px bg-primary/80" style={{ left: `${Math.min(100, Math.max(0, marker.position))}%` }} title={marker.label} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.18em]">
        <span className="text-primary">{currentTime}</span>
        <span className="text-foreground/70">{endTime}</span>
      </div>
    </div>
  );
}
