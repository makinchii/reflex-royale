import { cookies } from "next/headers";
import { DashboardTabs } from "@/components/app/dashboard-tabs";
import { GridBackground } from "@/components/app/grid-background";
import { parseAtmosphere } from "@/app/ui-lab/atmosphere";
import { requireCurrentUser } from "@/lib/auth";
import { getTopPlayers } from "@/lib/leaderboard";
import { pageTitle } from "@/lib/site-metadata";
import { parseIntensity, parseTheme, safeDecode } from "@/lib/ui-preferences";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Dashboard"),
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = await requireCurrentUser("/dashboard");
  const topPlayers = await getTopPlayers(10);
  const theme = parseTheme(cookieStore.get("ui-lab-theme")?.value);
  const intensity = parseIntensity(cookieStore.get("ui-lab-intensity")?.value);
  const atmosphere = parseAtmosphere(safeDecode(cookieStore.get("ui-lab-atmosphere")?.value));
  const userRank = topPlayers.findIndex((entry) => entry.username === user.username);

  return (
    <main className="relative min-h-svh overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <GridBackground theme={theme} intensity={intensity} atmosphere={atmosphere} />
      <div className="landing-global-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />

      <section className="landing-shell relative z-10 flex min-h-svh w-full flex-col px-4 pb-6 pt-6">
        <div className="landing-page-frame" aria-hidden="true" />

        <div className="relative z-[1] mx-auto mt-6 flex w-full max-w-[calc(100vw-4rem)] flex-1 flex-col gap-5 pb-8">
          <DashboardTabs
            user={user}
            userRank={userRank}
            playNowHref="/local"
            onlineHref={user ? "/online" : "/login?next=/online"}
            topPlayers={topPlayers}
          />

          <footer className="landing-footer-text">CS 160 : Team 3</footer>
        </div>
      </section>
    </main>
  );
}
