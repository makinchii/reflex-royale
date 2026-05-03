import { cookies } from "next/headers";
import Link from "next/link";
import { GridBackground } from "@/components/app/grid-background";
import { Reticle, TitleScreenDecor } from "@/components/app/title-screen-decor";
import { parseAtmosphere } from "@/app/ui-lab/atmosphere";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent } from "@/components/thegridcn/card";
import { getTopPlayers } from "@/lib/leaderboard";
import { pageTitle } from "@/lib/site-metadata";
import { parseIntensity, parseTheme, safeDecode } from "@/lib/ui-preferences";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Landing"),
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const playNowHref = "/navigate";
  const topPlayers = await getTopPlayers(5);
  const leaderboardRows = Array.from({ length: 10 }, (_, i) => topPlayers[i] ?? null);
  const theme = parseTheme(cookieStore.get("ui-lab-theme")?.value);
  const intensity = parseIntensity(cookieStore.get("ui-lab-intensity")?.value);
  const atmosphere = parseAtmosphere(safeDecode(cookieStore.get("ui-lab-atmosphere")?.value));

  return (
    <main className="relative h-svh overflow-hidden bg-background text-foreground">
      <GridBackground theme={theme} intensity={intensity} atmosphere={atmosphere} />
      <div className="landing-global-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />
      <TitleScreenDecor />

      <section className="landing-shell relative z-10 flex h-svh w-full flex-col px-4 pb-6 pt-6">
        <div className="landing-page-frame" aria-hidden="true" />
        <div className="relative z-[1] mx-auto mt-16 w-full max-w-5xl text-center">
          <Card className="relative mx-auto flex min-h-[34svh] w-full items-center justify-center overflow-hidden border-primary/45 bg-transparent py-0 shadow-none backdrop-blur-0 lg:min-h-[38svh]">
              <Reticle />
              <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/70" />
              <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r border-t border-primary/70" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-7 w-7 border-b border-l border-primary/70" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/70" />

              <CardContent className="relative px-6 py-10 sm:px-12 sm:py-14">
                <h1 className="font-display text-6xl font-black tracking-[0.15em] text-primary md:text-8xl lg:text-[9rem] [text-shadow:0_0_80px_oklch(from_var(--primary)_l_c_h/0.5),0_0_160px_oklch(from_var(--primary)_l_c_h/0.3)]">
                  <span className="block">Reflex</span>
                  <span className="block">Royale</span>
                </h1>
                <p className="mx-auto mt-7 max-w-3xl text-pretty font-mono text-sm leading-7 text-muted-foreground sm:text-base">
                  Competitive reflex test. Two to four players enter. One leaves victorious.
                </p>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="landing-play-button h-24 min-w-[24rem] cursor-pointer border border-primary bg-primary/20 px-14 text-2xl font-bold uppercase tracking-[0.28em] text-primary shadow-[var(--tron-border-glow)] hover:bg-primary/30">
                <Link href={playNowHref}>Play Now!</Link>
              </Button>
              {!user ? (
                <Button asChild size="lg" variant="outline" className="h-24 min-w-[20rem] cursor-pointer border-primary/40 bg-background/45 px-12 text-2xl font-bold uppercase tracking-[0.28em] text-primary hover:border-primary/70 hover:bg-primary/10">
                  <Link href="/signup">Sign Up!</Link>
                </Button>
              ) : null}
            </div>

            <section className="mx-auto mt-6 w-full max-w-3xl overflow-hidden rounded border border-primary/30 bg-background/85 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-primary/20 bg-primary/8 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/35" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Leaderboard Terminal</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Top Players</p>
              </div>

              <div className="px-3 py-3">
                <div className="space-y-2">
                  {leaderboardRows.map((entry, index) => {
                    const rank = index + 1;
                    const rankColor = rank === 1 ? "#D4AF37" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : undefined;

                    return (
                      <div key={`slot-${rank}`} className="flex items-center justify-between rounded border border-primary/20 bg-primary/6 px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={rankColor ? { color: rankColor } : undefined}>
                          #{rank}
                        </p>
                        <p className="max-w-[55%] truncate font-display text-base uppercase tracking-[0.08em] text-foreground">
                          {entry ? entry.username : "---"}
                        </p>
                        <p className="font-mono text-sm" style={rankColor ? { color: rankColor } : undefined}>
                          {entry ? (entry.bestScore > 0 ? `${entry.bestScore} ms` : "No score") : "---"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
        </div>

        <footer className="landing-footer-text">
          CS 160 : Team 3
        </footer>
      </section>
    </main>
  );
}
