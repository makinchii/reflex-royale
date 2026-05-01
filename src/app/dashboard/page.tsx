import { cookies } from "next/headers";
import { Activity } from "lucide-react";
import mongoose from "mongoose";
import { AuthMenu } from "@/components/app/auth-menu";
import { DashboardTabs } from "@/components/app/dashboard-tabs";
import { GridBackground } from "@/components/app/grid-background";
import { parseAtmosphere } from "@/app/ui-lab/atmosphere";
import { requireCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/thegridcn/badge";
import type { Theme } from "@/components/theme";

export const dynamic = "force-dynamic";

type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

function parseTheme(value: string | undefined): Theme {
  return value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon" ? value : "tron";
}

function parseIntensity(value: string | undefined) {
  return value === "none" || value === "medium" || value === "heavy" ? value : "light";
}

function safeDecode(value: string | undefined) {
  if (!value) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function getTopPlayers(): Promise<LeaderboardEntry[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const users = mongoose.connection.db?.collection("users");
  if (!users) {
    return [];
  }

  return users
    .aggregate<LeaderboardEntry>([
      {
        $project: {
          username: 1,
          bestScore: { $ifNull: ["$bestScore", 0] },
          hasScore: {
            $cond: [{ $gt: [{ $ifNull: ["$bestScore", 0] }, 0] }, 0, 1],
          },
        },
      },
      {
        $sort: {
          hasScore: 1,
          bestScore: 1,
          username: 1,
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          username: 1,
          bestScore: 1,
        },
      },
    ])
    .toArray();
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = await requireCurrentUser("/dashboard");
  const topPlayers = await getTopPlayers();
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-primary/25 bg-card/15 px-4 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded border border-primary/25 bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Reflex Royale Dashboard</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Protected command center</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-primary/30 text-primary">
                Ready
              </Badge>
              <AuthMenu user={user} />
            </div>
          </div>

          <DashboardTabs
            user={user}
            userRank={userRank}
            playNowHref="/play"
            onlineHref={user ? "/play/online" : "/login?next=/play/online"}
            topPlayers={topPlayers}
          />

          <footer className="landing-footer-text">CS 160 : Team 3</footer>
        </div>
      </section>
    </main>
  );
}
