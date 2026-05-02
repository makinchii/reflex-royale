import { DashboardTabs } from "@/components/app/dashboard-tabs";
import { CircuitBackground } from "@/components/thegridcn/circuit-background";
import { requireCurrentUser } from "@/lib/auth";
import { getTopPlayers } from "@/lib/leaderboard";
import { getPlayerPerformanceStats, getRecentMatches } from "@/lib/recent-matches";
import { pageTitle } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Dashboard"),
};

export default async function DashboardPage() {
  const user = await requireCurrentUser("/dashboard");
  const topPlayers = await getTopPlayers(10);
  const recentMatches = await getRecentMatches(user.username, 5);
  const performanceStats = await getPlayerPerformanceStats(user.username);
  const userRank = topPlayers.findIndex((entry) => entry.username === user.username);

  return (
    <main className="dashboard-page relative bg-background text-foreground">
      <CircuitBackground animated={false} opacity={0.12} className="dashboard-circuit-background pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />

      <section className="dashboard-shell landing-shell relative z-10 flex min-h-svh w-full flex-col px-4 pb-6 pt-6">
        <div className="landing-page-frame" aria-hidden="true" />

        <div className="dashboard-content relative z-[1] mx-auto flex w-full flex-1 flex-col gap-5 pb-8">
          <DashboardTabs
            user={user}
            userRank={userRank}
            playNowHref="/local"
            onlineHref={user ? "/online" : "/login?next=/online"}
            performanceStats={performanceStats}
            recentMatches={recentMatches}
            topPlayers={topPlayers}
          />

          <footer className="landing-footer-text">CS 160 : Team 3</footer>
        </div>
      </section>
    </main>
  );
}
