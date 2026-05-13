import { Navigation } from "lucide-react";
import Link from "next/link";
import { WireframeDottedGlobe } from "@/components/app/wireframe-dotted-globe";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent } from "@/components/thegridcn/card";

export function DashboardPlaySection({
  arenaActive,
  customThemeColor,
  setArenaActive,
  setSectionRef,
  themeCommand,
  visualAnimationsEnabled,
}: {
  arenaActive: boolean;
  customThemeColor: string;
  setArenaActive: (active: boolean) => void;
  setSectionRef: (element: HTMLElement | null) => void;
  themeCommand: string;
  visualAnimationsEnabled: boolean;
}) {
  return (
    <section
      ref={setSectionRef}
      data-section-id="play"
      className="dashboard-play-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
    >
      <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Play Now</div>
      <div className="dashboard-play-grid grid gap-5">
        <Card
          className="dashboard-arena-card border-primary/35 bg-card/15 backdrop-blur-xl"
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setArenaActive(false);
          }}
          onFocusCapture={() => setArenaActive(true)}
          onMouseEnter={() => setArenaActive(true)}
          onMouseLeave={() => setArenaActive(false)}
        >
          <div className="dashboard-arena-card__earth" aria-hidden="true">
            <WireframeDottedGlobe key={`arena-earth-${themeCommand}-${customThemeColor}`} animated={arenaActive && visualAnimationsEnabled} width={2400} height={2400} kind="earth" surface="grid" />
          </div>
          <CardContent className="dashboard-arena-card__content px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="font-mono text-sm uppercase tracking-[0.34em] text-primary/75">Arena vector select</p>
                <h1 className="fluorescent-title mt-4 font-display text-7xl font-black uppercase tracking-[0.14em] text-primary sm:text-8xl lg:text-[9rem]">
                  Choose your arena.
                </h1>
                <p className="mt-6 max-w-4xl font-mono text-lg leading-9 text-muted-foreground sm:text-xl">
                  Launch a match, assess the competition, or search for adversaries across the universe.
                </p>
              </div>
              <div className="dashboard-arena-card__readout rounded border border-primary/25 bg-background/55 px-5 py-4 font-mono text-sm uppercase tracking-[0.2em] text-primary/80">
                <p>RX-160 / COMMAND</p>
                <p className="mt-1 text-muted-foreground">Status: Route stable</p>
              </div>
            </div>

            <div className="dashboard-arena-card__actions mt-40 flex flex-wrap gap-4">
              <Button asChild size="lg" className="dashboard-navigation-button h-28 min-w-[28rem] cursor-pointer border border-primary bg-primary/20 px-16 text-4xl font-bold uppercase tracking-[0.26em] text-primary shadow-[var(--tron-border-glow)]">
                <Link href="/navigate">
                  <Navigation className="h-10 w-10" />
                  Navigation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
