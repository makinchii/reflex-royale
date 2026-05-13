import { RadioTower, Zap } from "lucide-react";
import { rankColor, type LeaderboardEntry, type RecentMatch } from "@/components/app/dashboard-settings";
import { Badge } from "@/components/thegridcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";

export function DashboardAnalyticsSection({
  leaderboardRows,
  performanceMetrics,
  recentMatches,
  setSectionRef,
}: {
  leaderboardRows: Array<LeaderboardEntry | null>;
  performanceMetrics: Array<{ label: string; value: string }>;
  recentMatches: RecentMatch[];
  setSectionRef: (element: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={setSectionRef}
      data-section-id="analytics"
      className="dashboard-analytics-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
    >
      <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Analytics</div>
      <div className="dashboard-analytics-grid grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]">
        <Card className="dashboard-analytics-card dashboard-compact-analytics-card border-primary/25 bg-card/15 backdrop-blur-xl">
          <CardHeader className="dashboard-analytics-card-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Performance</CardTitle>
                <CardDescription>Online match statistics only.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Online only
                </Badge>
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="dashboard-performance-content grid gap-2 sm:grid-cols-2">
            {performanceMetrics.map((metric) => (
              <div key={metric.label} className="rounded border border-primary/20 bg-primary/5 px-3 py-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                <p className="truncate font-display text-2xl uppercase tracking-[0.08em] text-primary">{metric.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="dashboard-analytics-card dashboard-compact-analytics-card border-primary/25 bg-background/80 backdrop-blur-xl">
          <CardHeader className="dashboard-analytics-card-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Top Players</CardTitle>
                <CardDescription>Top players from the current season.</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="dashboard-leaderboard-content px-4 pb-4">
            {leaderboardRows.map((entry, index) => {
              const rank = index + 1;
              const color = rankColor(rank);
              return (
                <div key={`slot-${rank}`} className="flex min-h-9 items-center justify-between rounded border border-primary/20 bg-primary/5 px-3 py-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={color ? { color } : undefined}>#{rank}</p>
                  <p className="max-w-[55%] truncate font-display text-base uppercase tracking-[0.08em] text-foreground">{entry ? entry.username : "---"}</p>
                  <p className="font-mono text-sm" style={color ? { color } : undefined}>{entry ? (entry.bestScore > 0 ? `${entry.bestScore} ms` : "No score") : "---"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="dashboard-analytics-card dashboard-recent-matches-card border-primary/25 bg-card/15 backdrop-blur-xl xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Recent Matches</CardTitle>
                <CardDescription>Latest match placements and average reaction time.</CardDescription>
              </div>
              <RadioTower className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="dashboard-recent-matches-content space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_8rem_13rem] gap-3 border-b border-primary/20 px-4 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Match</span>
              <span>Place</span>
              <span>Avg Reaction</span>
            </div>
            {recentMatches.length > 0 ? (
              recentMatches.map((match, index) => (
                <div key={`${match.mode}-${match.place}-${match.averageReactionTime}-${index}`} className="grid min-h-0 grid-cols-[minmax(0,1fr)_8rem_13rem] items-center gap-3 rounded border border-primary/20 bg-primary/5 px-4 py-2">
                  <p className="truncate font-semibold text-foreground">{match.mode === "online" ? "Online Match" : "Local Match"}</p>
                  <p className="font-display text-lg uppercase tracking-[0.08em] text-primary">#{match.place}</p>
                  <p className="font-mono text-sm text-foreground/80">{match.averageReactionTime} ms</p>
                </div>
              ))
            ) : (
              <div className="dashboard-empty-matches rounded border border-primary/20 bg-primary/5 px-4 py-6 text-center">
                <p className="font-display text-lg uppercase tracking-[0.08em] text-primary">No recent matches logged</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Match history is not available yet. Future matches will show place and average reaction time here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
