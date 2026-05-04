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
  const theme = user ? parseTheme(cookieStore.get("ui-lab-theme")?.value) : "tron";
  const intensity = parseIntensity(cookieStore.get("ui-lab-intensity")?.value);
  const atmosphere = parseAtmosphere(safeDecode(cookieStore.get("ui-lab-atmosphere")?.value));

  return (
    <main className="landing-root relative h-svh overflow-hidden bg-background text-foreground">
      <GridBackground theme={theme} intensity={intensity} atmosphere={atmosphere} useStoredTheme={Boolean(user)} />
      <div className="landing-global-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />
      <TitleScreenDecor />

      <section className="landing-shell relative z-10 flex h-svh w-full flex-col px-4 pb-6 pt-6">
        <div className="landing-page-frame" aria-hidden="true" />
        <div className="landing-content-stack">
          <Card className="landing-hero-card relative mx-auto flex w-full items-center justify-center overflow-hidden border-primary/45 bg-transparent py-0 shadow-none backdrop-blur-0">
            <Reticle className="landing-reticle" />
            <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/70" />
            <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r border-t border-primary/70" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-7 w-7 border-b border-l border-primary/70" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/70" />

            <CardContent className="landing-hero-content relative px-6 py-10 sm:px-12 sm:py-14">
              <h1 className="landing-title-lockup fluorescent-title font-display font-black text-primary">
                <span className="block">Reflex</span>
                <span className="block">Royale</span>
              </h1>
              <p className="landing-hero-copy mx-auto max-w-3xl text-pretty font-mono text-sm text-muted-foreground sm:text-base">
                Competitive reflex test. Two to four players enter. One leaves victorious.
              </p>
            </CardContent>
          </Card>

          <div className="landing-action-row flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="landing-action-button landing-play-button cursor-pointer border border-primary bg-primary/20 font-bold uppercase text-primary shadow-[var(--tron-border-glow)] hover:bg-primary/30">
              <Link href={playNowHref}>Play Now!</Link>
            </Button>
            {!user ? (
              <Button asChild size="lg" variant="outline" className="landing-action-button landing-action-button--secondary cursor-pointer border-primary/40 bg-background/45 font-bold uppercase text-primary hover:border-primary/70 hover:bg-primary/10">
                <Link href="/signup">Sign Up!</Link>
              </Button>
            ) : null}
          </div>

          <section className="landing-leaderboard-terminal mx-auto w-full overflow-hidden rounded border border-primary/30 bg-background/85 backdrop-blur-md">
            <div className="landing-leaderboard-header flex items-center justify-between border-b border-primary/20 bg-primary/8 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/35" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Leaderboard Terminal</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Top Players</p>
            </div>

            <div className="landing-leaderboard-body px-3 py-3">
              <div className="landing-leaderboard-rows space-y-2">
                {leaderboardRows.map((entry, index) => {
                  const rank = index + 1;
                  const rankColor = rank === 1 ? "#D4AF37" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : undefined;

                  return (
                    <div key={`slot-${rank}`} className="landing-leaderboard-row flex items-center justify-between rounded border border-primary/20 bg-primary/6 px-3 py-2">
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
