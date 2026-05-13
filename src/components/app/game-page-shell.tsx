import { cookies } from "next/headers";
import Link from "next/link";
import { RadioTower, Shield, Users, Zap } from "lucide-react";
import { parseAtmosphere } from "@/lib/visual-atmosphere";
import { GridBackground } from "@/components/app/grid-background";
import type { AppAuthUser } from "@/lib/auth";
import { parseIntensity, parseTheme, safeDecode } from "@/lib/ui-preferences";

type GameMode = "local" | "online";

const modeCopy: Record<GameMode, {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  players: string;
  signal: string;
}> = {
  local: {
    eyebrow: "Arena boot sequence",
    title: "Local Play",
    description: "Shared-keyboard reflex rounds for two to four players on one command deck.",
    status: "Local input armed",
    players: "2-4 operators",
    signal: "Keyboard relay",
  },
  online: {
    eyebrow: "Network room uplink",
    title: "Online Play",
    description: "Server-authoritative room play with lobby, chat, reconnect, and host controls.",
    status: "Socket bridge ready",
    players: "Remote squad",
    signal: "Realtime uplink",
  },
};

function TelemetryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="play-telemetry-chip">
      <span className="shrink-0 text-primary/75">{icon}</span>
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-primary/75">{label}</span>
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/75">{value}</span>
    </div>
  );
}

export async function GamePageShell({ mode, user, children }: { mode: GameMode; user: AppAuthUser | null; children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get("ui-lab-theme")?.value);
  const intensity = parseIntensity(cookieStore.get("ui-lab-intensity")?.value);
  const atmosphere = parseAtmosphere(safeDecode(cookieStore.get("ui-lab-atmosphere")?.value));
  const copy = modeCopy[mode];

  return (
    <main className="relative min-h-svh overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <GridBackground theme={theme} intensity={intensity} atmosphere={atmosphere} />
      <div className="landing-global-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />

      <section className="landing-shell relative z-10 flex min-h-svh w-full flex-col px-3 py-3 sm:px-4 sm:py-4">
        <div className="landing-page-frame" aria-hidden="true" />

        <div className="play-cockpit-shell relative z-[1] flex w-full min-h-0 flex-1 flex-col gap-3">
          <header className="play-command-banner">
            <div className="play-command-banner__identity">
              <div className="play-command-banner__icon">
                {mode === "online" ? <RadioTower className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary/75">{copy.eyebrow}</p>
                <h1 className="truncate font-display text-xl font-black tracking-[0.16em] text-primary sm:text-2xl">{copy.title}</h1>
              </div>
            </div>

            <div className="play-command-banner__summary">
              <div className="play-command-banner__telemetry">
                <TelemetryChip icon={mode === "online" ? <RadioTower className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} label="Mode" value={copy.status} />
                <TelemetryChip icon={<Users className="h-3.5 w-3.5" />} label="Roster" value={copy.players} />
                <TelemetryChip icon={<Shield className="h-3.5 w-3.5" />} label="Runtime" value={copy.signal} />
              </div>
            </div>

            <div className="play-command-banner__actions">
              <div className="play-command-banner__audio-slot" />
              <Link href="/dashboard" className="play-command-button min-w-36">
                Dashboard
              </Link>
              <Link href="/" className="play-command-button min-w-32">
                Retire
              </Link>
            </div>
          </header>

          <div className="game-shell-stage game-hud-frame">
            <div className="game-hud-frame__rail game-hud-frame__rail--top" aria-hidden="true" />
            <div className="game-hud-frame__rail game-hud-frame__rail--bottom" aria-hidden="true" />
            <div className="game-hud-frame__corner game-hud-frame__corner--tl" aria-hidden="true" />
            <div className="game-hud-frame__corner game-hud-frame__corner--tr" aria-hidden="true" />
            <div className="game-hud-frame__corner game-hud-frame__corner--bl" aria-hidden="true" />
            <div className="game-hud-frame__corner game-hud-frame__corner--br" aria-hidden="true" />
            <div className="game-hud-frame__content">
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
