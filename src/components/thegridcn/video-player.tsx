"use client";

import * as React from "react";
import { FastForward, Pause, Play, Repeat, Rewind, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  currentTime?: string;
  status?: "playing" | "paused" | "stopped";
  onPlay?: () => void;
  onPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  loopEnabled?: boolean;
  onToggleLoop?: () => void;
  progressSlot?: React.ReactNode;
}

export function VideoPlayer({ currentTime = "00:00", status = "paused", onPlay, onPause, onRewind, onFastForward, onPrevious, onNext, loopEnabled = false, onToggleLoop, progressSlot, children, className, ...props }: VideoPlayerProps) {
  return (
    <div data-slot="video-player" className={cn("relative", className)} {...props}>
      <div className="relative overflow-hidden border border-primary/30 bg-black shadow-[0_0_32px_color-mix(in_oklch,var(--primary)_16%,transparent)]">
        <div className="relative aspect-video overflow-hidden bg-muted/20">
          <div className="pointer-events-none absolute left-3 top-3 z-20 h-8 w-8 border-l-2 border-t-2 border-primary" />
          <div className="pointer-events-none absolute right-3 top-3 z-20 h-8 w-8 border-r-2 border-t-2 border-primary" />
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-8 w-8 border-b-2 border-l-2 border-primary" />
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-8 w-8 border-b-2 border-r-2 border-primary" />
          {children}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.035)_2px,rgba(255,255,255,0.035)_4px)]" />

        {progressSlot ? <div className="relative border-t border-primary/30 bg-background/90 px-4 py-3 backdrop-blur-sm">{progressSlot}</div> : null}

        <div className="border-t border-primary/30 bg-background/85 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-lg text-primary/50">[</span>
            <button type="button" onClick={onRewind} className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-xs text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <span className="text-[10px]">-</span>
              <span>10</span>
              <Rewind className="h-4 w-4" />
            </button>
            <button type="button" onClick={onPrevious} className="cursor-pointer p-1 text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="Previous track">
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" onClick={status === "playing" ? onPause : onPlay} className="cursor-pointer border border-primary/50 p-2 text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={status === "playing" ? "Pause" : "Play"}>
              {status === "playing" ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={onNext} className="cursor-pointer p-1 text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="Next track">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" onClick={onFastForward} className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-xs text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <FastForward className="h-4 w-4" />
              <span>10</span>
              <span className="text-[10px]">-</span>
            </button>
            <button type="button" onClick={onToggleLoop} className={cn("cursor-pointer p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", loopEnabled ? "text-primary" : "text-foreground/80 hover:text-primary")} aria-label={loopEnabled ? "Disable track loop" : "Enable track loop"} aria-pressed={loopEnabled}>
              <Repeat className="h-4 w-4" />
            </button>
            <span className="font-mono text-lg text-primary/50">]</span>
          </div>
          <span className="sr-only">{currentTime} elapsed</span>
        </div>
      </div>
    </div>
  );
}
