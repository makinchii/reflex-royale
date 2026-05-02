"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TerminalLine = {
  text: string;
  type?: "input" | "output" | "error" | "system";
};

const terminalLines: TerminalLine[] = [
  { type: "system", text: "ORBITAL RELAY ONLINE" },
  { type: "output", text: "Scanning reflex candidates across local sector..." },
  { type: "input", text: "prime_reaction_grid --arena=royale" },
  { type: "output", text: "Neural latency window stabilized at 00.260s" },
  { type: "system", text: "Launch corridor clear // Awaiting challenger" },
];

function Radar({ className }: { className?: string }) {
  const targets = [
    { x: 66, y: 28, label: "A1" },
    { x: 34, y: 64, label: "B7" },
    { x: 73, y: 72, label: "C3" },
  ];

  return (
    <div className={cn("relative h-72 w-72 overflow-hidden rounded-full border border-primary/40 bg-background/80 shadow-[0_0_36px_color-mix(in_oklch,var(--primary)_22%,transparent)] backdrop-blur-md", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="titleRadarSweep" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" className="fill-primary/5 stroke-primary" strokeWidth="1" />
        {[12, 24, 36].map((r) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" className="stroke-primary/25" strokeWidth="0.5" />
        ))}
        <line x1="50" y1="3" x2="50" y2="97" className="stroke-primary/20" strokeWidth="0.5" />
        <line x1="3" y1="50" x2="97" y2="50" className="stroke-primary/20" strokeWidth="0.5" />
        <g className="origin-center animate-[spin_4s_linear_infinite]">
          <path d="M 50 50 L 50 3 A 47 47 0 0 0 83 17 Z" fill="url(#titleRadarSweep)" />
          <line x1="50" y1="50" x2="50" y2="3" className="stroke-primary" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <circle cx="50" cy="50" r="2" className="fill-primary" />
        {targets.map((target) => (
          <g key={target.label}>
            <circle cx={target.x} cy={target.y} r="4" fill="none" className="stroke-red-500/80" strokeWidth="0.8" />
            <circle cx={target.x} cy={target.y} r="1.7" className="fill-red-500" />
            <text x={target.x + 6} y={target.y + 1.5} className="fill-red-500" fontSize="5" fontFamily="monospace">{target.label}</text>
          </g>
        ))}
        <text x="50" y="8" textAnchor="middle" className="fill-primary/70" fontSize="5" fontFamily="monospace">N</text>
      </svg>
    </div>
  );
}

export function Reticle({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute left-1/2 top-1/2 h-[31rem] w-[31rem] -translate-x-1/2 -translate-y-1/2 opacity-35", className)} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-full w-full animate-pulse">
        <circle cx="50" cy="50" r="45" fill="none" className="stroke-primary/40" strokeWidth="0.45" />
        <circle cx="50" cy="50" r="28" fill="none" className="stroke-primary/45" strokeWidth="0.35" />
        <circle cx="50" cy="50" r="4" fill="none" className="stroke-primary/60" strokeWidth="0.5" />
        <line x1="50" y1="1" x2="50" y2="19" className="stroke-primary/60" strokeWidth="0.5" />
        <line x1="50" y1="81" x2="50" y2="99" className="stroke-primary/60" strokeWidth="0.5" />
        <line x1="1" y1="50" x2="19" y2="50" className="stroke-primary/60" strokeWidth="0.5" />
        <line x1="81" y1="50" x2="99" y2="50" className="stroke-primary/60" strokeWidth="0.5" />
        <path d="M 13 25 L 13 13 L 25 13 M 75 13 L 87 13 L 87 25 M 87 75 L 87 87 L 75 87 M 25 87 L 13 87 L 13 75" fill="none" className="stroke-primary/70" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function Terminal({ className }: { className?: string }) {
  const [revealedLines, setRevealedLines] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;
    let timeoutId: number;
    let cancelled = false;

    setRevealedLines(0);
    setCharCount(0);

    function typeNext() {
      if (cancelled || lineIndex >= terminalLines.length) return;

      const currentLine = terminalLines[lineIndex];
      if (charIndex < currentLine.text.length) {
        charIndex += 1;
        setCharCount(charIndex);
        timeoutId = window.setTimeout(typeNext, 18 + Math.random() * 24);
        return;
      }

      lineIndex += 1;
      charIndex = 0;
      setRevealedLines(lineIndex);
      setCharCount(0);
      timeoutId = window.setTimeout(typeNext, 180 + Math.random() * 140);
    }

    timeoutId = window.setTimeout(typeNext, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const colorByType = {
    input: "text-primary",
    output: "text-foreground/80",
    error: "text-red-500",
    system: "text-amber-400",
  } satisfies Record<NonNullable<TerminalLine["type"]>, string>;

  const prefixByType = {
    input: "> ",
    output: "  ",
    error: "! ",
    system: ":: ",
  } satisfies Record<NonNullable<TerminalLine["type"]>, string>;

  return (
    <div className={cn("relative w-[26rem] overflow-hidden rounded border border-primary/40 bg-background/85 text-left shadow-[0_0_28px_color-mix(in_oklch,var(--primary)_12%,transparent)] backdrop-blur-md", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.04)_2px,rgba(0,0,0,0.04)_4px)]" />
      <div className="relative flex items-center justify-between border-b border-primary/25 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Ship Terminal</span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
      </div>
      <div className="relative space-y-1 p-4 font-mono text-xs leading-5">
        {terminalLines.map((line, index) => {
          const type = line.type ?? "output";

          if (index > revealedLines) return null;

          const isActiveLine = index === revealedLines;
          const text = isActiveLine ? line.text.slice(0, charCount) : line.text;

          return (
            <div key={line.text} className={colorByType[type]}>
              <span className="opacity-60">{prefixByType[type]}</span>
              {text}
              {isActiveLine ? <span className="animate-pulse text-primary">▌</span> : null}
            </div>
          );
        })}
        {revealedLines >= terminalLines.length ? <div className="inline-flex text-primary"><span className="opacity-60">&gt; </span><span className="animate-pulse">▌</span></div> : null}
      </div>
    </div>
  );
}

function ClockTimer({ className }: { className?: string }) {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date());
    const interval = window.setInterval(() => setDate(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const time = useMemo(() => {
    if (!date) return "--:--:--";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }, [date]);

  return (
    <div className={cn("rounded border border-primary/35 bg-background/80 px-4 py-3 text-left shadow-[var(--tron-border-glow)] backdrop-blur-md", className)}>
      <p className="text-[9px] uppercase text-muted-foreground" style={{ fontFamily: "var(--tron-font)", letterSpacing: "var(--tron-letter-spacing-wide)" }}>Ship Time</p>
      <p className="mt-1 text-3xl font-light text-primary [text-shadow:0_0_calc(var(--tron-glow-spread-md)*var(--tron-glow-intensity))_var(--glow)]" style={{ fontFamily: "var(--tron-font)", letterSpacing: "var(--tron-letter-spacing)" }}>{time}</p>
      <p className="mt-1 text-[9px] uppercase text-muted-foreground" style={{ fontFamily: "var(--tron-font)", letterSpacing: "var(--tron-letter-spacing-wide)" }}>24H Sync</p>
    </div>
  );
}

function LocationDisplay({ className }: { className?: string }) {
  const [coords, setCoords] = useState({ x: 847.23, y: 129.45, z: 12.08 });

  useEffect(() => {
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const t = (performance.now() - startedAt) / 1000;
      setCoords({
        x: 847.23 + Math.sin(t * 0.7) * 4.8,
        y: 129.45 + Math.cos(t * 0.53) * 3.6,
        z: 12.08 + Math.sin(t * 0.31) * 1.2,
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={cn("rounded border border-primary/35 bg-background/80 px-4 py-3 text-right shadow-[0_0_22px_color-mix(in_oklch,var(--primary)_12%,transparent)] backdrop-blur-md", className)}>
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Location Display</p>
      <div className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-[0.18em]">
        <p><span className="text-muted-foreground">Sector</span> <span className="text-primary">Orion-7G</span></p>
        <p><span className="text-muted-foreground">Grid</span> <span className="text-foreground/80">RX-160 / Lane 03</span></p>
        <p><span className="text-muted-foreground">Coords</span> <span className="text-foreground/80">X: {coords.x.toFixed(2)} Y: {coords.y.toFixed(2)} Z: {coords.z.toFixed(2)}</span></p>
        <p><span className="text-muted-foreground">Status</span> <span className="text-green-400">Arena Stable</span></p>
      </div>
    </div>
  );
}

export function TitleScreenDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden lg:block" aria-hidden="true">
      <ClockTimer className="absolute left-12 top-12" />
      <Radar className="absolute right-12 top-20" />
      <Terminal className="absolute bottom-14 left-12" />
      <LocationDisplay className="absolute bottom-14 right-12" />
    </div>
  );
}
