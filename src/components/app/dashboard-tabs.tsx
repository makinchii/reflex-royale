"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, ChevronLeft, Gamepad2, Navigation, Power, RadioTower, Settings2, ShieldCheck, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthMenu, performLogout } from "@/components/app/auth-menu";
import { WireframeDottedGlobe } from "@/components/app/wireframe-dotted-globe";
import { playUiClick } from "@/lib/audio";
import { Badge } from "@/components/thegridcn/badge";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/thegridcn/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/thegridcn/select";
import type { AppAuthUser } from "@/lib/auth";
import type { PlayerPerformanceStats } from "@/lib/recent-matches";

type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

type TabId = "play" | "analytics" | "settings" | "profile";

type NavItem = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

type RecentMatch = {
  mode: "local" | "online";
  playedAt: Date | string;
  place: number;
  averageReactionTime: number;
};

function rankColor(rank: number) {
  if (rank === 1) return "#D4AF37";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return undefined;
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function SidebarButton({ active, collapsed, icon, label, onClick }: { active: boolean; collapsed: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      title={label}
      className={`group relative grid h-10 w-full grid-cols-[5rem_minmax(0,1fr)] items-center overflow-hidden text-left transition-[background-color,color,border-color,transform,box-shadow] duration-500 active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
        active
          ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_var(--primary),0_0_26px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      }`}
    >
      <span className={`flex h-full w-20 items-center justify-center ${active ? "text-primary drop-shadow-[0_0_10px_var(--primary)]" : "text-muted-foreground group-hover:text-primary"}`}>{icon}</span>
      <span className={`truncate text-left font-mono text-sm font-semibold tracking-[0.04em] transition-all duration-300 ${collapsed ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"}`}>{label}</span>
    </button>
  );
}

function SettingsRoundSlider({ label, value }: { label: string; value: number }) {
  return (
    <div data-slot="tron-slider" className="round-slider dashboard-round-slider" aria-label={`${label} slider`}>
      <div className="round-slider__header">
        <span className="dashboard-settings-label">{label}</span>
        <span className="round-slider__value">{value}%</span>
      </div>
      <div className="round-slider__track-wrap">
        <div data-slot="slider-track" className="round-slider__track" />
        <div data-slot="slider-range" className="round-slider__range" style={{ width: `${value}%` }} />
        <div data-slot="slider-thumb" className="round-slider__thumb" style={{ left: `${value}%` }} />
        <input className="round-slider__input" type="range" min="0" max="100" step="1" defaultValue={value} aria-label={label} />
      </div>
    </div>
  );
}

export function DashboardTabs({
  user,
  userRank,
  playNowHref,
  onlineHref,
  performanceStats,
  recentMatches,
  topPlayers,
}: {
  user: AppAuthUser;
  userRank: number;
  playNowHref: string;
  onlineHref: string;
  performanceStats: PlayerPerformanceStats;
  recentMatches: RecentMatch[];
  topPlayers: LeaderboardEntry[];
}) {
  const [tab, setTab] = useState<TabId>("play");
  const [arenaActive, setArenaActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sectionRefs = useRef<Record<TabId, HTMLElement | null>>({
    play: null,
    analytics: null,
    settings: null,
    profile: null,
  });
  const router = useRouter();

  const leaderboardRows = useMemo(() => Array.from({ length: 10 }, (_, index) => topPlayers[index] ?? null), [topPlayers]);
  const recentAverageReactionTime = recentMatches.length
    ? Math.round(recentMatches.reduce((total, match) => total + match.averageReactionTime, 0) / recentMatches.length)
    : 0;
  const recentWinRate = recentMatches.length
    ? Math.round((recentMatches.filter((match) => match.place === 1).length / recentMatches.length) * 100)
    : 0;
  const lifetimeAverage = performanceStats.reactions > 0
    ? Math.round(performanceStats.totalReactionTime / performanceStats.reactions)
    : 0;
  const performanceMetrics = [
    { label: "Current Rank", value: userRank >= 0 ? `#${userRank + 1}` : "--" },
    { label: "Best Reaction", value: user.bestScore > 0 ? `${user.bestScore} ms` : "--" },
    { label: "Lifetime Avg", value: lifetimeAverage > 0 ? `${lifetimeAverage} ms` : "--" },
    { label: "Wins", value: String(performanceStats.wins) },
    { label: "Current Streak", value: String(performanceStats.currentWinStreak) },
    { label: "Best Streak", value: String(performanceStats.bestWinStreak) },
    { label: "Games Played", value: String(performanceStats.gamesPlayed) },
    { label: "False Starts", value: String(performanceStats.falseStarts) },
    { label: "Time Played", value: formatDuration(performanceStats.timeSpentPlayingSeconds) },
    { label: "Reactions", value: String(performanceStats.reactions) },
    { label: "Recent Avg", value: recentAverageReactionTime > 0 ? `${recentAverageReactionTime} ms` : "--" },
    { label: "Win Rate", value: recentMatches.length ? `${recentWinRate}%` : "--" },
  ];
  const navItems: NavItem[] = [
    { id: "play", label: "Play Now", icon: <Gamepad2 className="h-10 w-7" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-10 w-7" /> },
    { id: "settings", label: "Settings", icon: <Settings2 className="h-10 w-7" /> },
    { id: "profile", label: "Profile", icon: <UserRound className="h-10 w-7" /> },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;

        const id = visible[0].target.getAttribute("data-section-id") as TabId | null;
        if (id) setTab(id);
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: [0.25, 0.5, 0.75] }
    );

    const sections = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: TabId) {
    playUiClick();
    setTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sidebarClassName = `hidden overflow-hidden transition-[width] duration-300 ease-out md:flex md:flex-col md:rounded md:border md:border-primary/25 md:bg-background/80 md:backdrop-blur-xl ${
    sidebarCollapsed ? "md:w-20" : "md:w-64"
  }`;

  return (
    <div className="dashboard-layout grid flex-1 items-stretch gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className={`hidden transition-[width] duration-300 ease-out md:block ${sidebarCollapsed ? "md:w-20" : "md:w-64"}`}>
      <aside className={`${sidebarClassName} md:fixed md:left-8 md:top-12 md:z-30 md:h-[calc(100svh-6rem)] md:max-h-[calc(100svh-6rem)] md:overflow-y-auto md:overflow-x-hidden`}>
        <div className="flex h-16 items-center border-b border-primary/20 p-2">
          {!sidebarCollapsed ? (
            <div className="flex flex-1 min-w-0 items-center gap-3 pl-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/35 bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <span className="truncate font-display text-sm font-bold uppercase tracking-[0.12em] text-primary">Navigation</span>
            </div>
          ) : null}
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              playUiClick();
              setSidebarCollapsed((value) => !value);
            }}
            className={`${sidebarCollapsed ? "w-full" : ""} flex items-center justify-center rounded p-1.5 text-primary/70 transition-[background-color,color,transform] duration-500 active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-primary/10 hover:text-primary`}
          >
            <ChevronLeft className={`h-8 w-6 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : "rotate-0"}`} />
          </button>
        </div>
        <div className="flex-1 py-4">
          {navItems.map((item) => (
            <SidebarButton
              key={item.id}
              active={tab === item.id}
              collapsed={sidebarCollapsed}
              icon={item.icon}
              label={item.label}
              onClick={() => scrollToSection(item.id)}
            />
          ))}
        </div>
        <div className="border-t border-primary/20 p-2">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="group relative grid h-10 w-full grid-cols-[5rem_minmax(0,1fr)] items-center overflow-hidden text-left text-muted-foreground transition-[background-color,color,transform] duration-500 active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-primary/5 hover:text-primary" title="Power options" onClick={() => playUiClick()}>
                <span className="flex h-full w-15 items-center justify-center text-muted-foreground group-hover:text-primary"><Power className="h-8 w-6" /></span>
                <span className={`truncate font-mono text-sm font-semibold tracking-[0.04em] transition-all duration-300 ${sidebarCollapsed ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"}`}>Retire</span>
              </button>
            </DialogTrigger>
            <DialogContent className="border-primary/30 bg-background/95">
              <DialogHeader>
                <DialogTitle className="font-display uppercase tracking-[0.08em] text-primary">Power Menu</DialogTitle>
                <DialogDescription>Choose whether to return to the command screen or end your current exploration.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="border-primary/30" onClick={() => router.push("/")}>Return to Title</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await performLogout();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Log Out
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>
      </div>

      <div className="dashboard-main flex flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 rounded border border-primary/20 bg-card/15 p-2 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-[background-color,color,border-color,transform] duration-500 active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                tab === item.id
                  ? "border-primary bg-primary/15 text-primary shadow-[0_0_18px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
                  : "border-primary/20 bg-card/20 text-muted-foreground hover:border-primary/35 hover:text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section
          ref={(el) => {
            sectionRefs.current.play = el;
          }}
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
                <WireframeDottedGlobe animated={arenaActive} width={2400} height={2400} kind="earth" surface="grid" />
              </div>
              <CardContent className="dashboard-arena-card__content px-6 py-8 sm:px-10 sm:py-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="font-mono text-sm uppercase tracking-[0.34em] text-primary/75">Arena vector select</p>
                    <h1 className="mt-4 font-display text-7xl font-black uppercase tracking-[0.14em] text-primary sm:text-8xl lg:text-[9rem] [text-shadow:0_0_80px_oklch(from_var(--primary)_l_c_h/0.45),0_0_160px_oklch(from_var(--primary)_l_c_h/0.25)]">
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

        <section
          ref={(el) => {
            sectionRefs.current.analytics = el;
          }}
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

        <section
          ref={(el) => {
            sectionRefs.current.settings = el;
          }}
          data-section-id="settings"
          className="dashboard-settings-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Settings</div>
          <div className="dashboard-settings-grid grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
            <Card className="dashboard-panel-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Visual & Audio</CardTitle>
                    <CardDescription>Tune display intensity and game sound behavior.</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content dashboard-settings-controls">
                <div className="dashboard-settings-control-group">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="dashboard-settings-control-heading">Visual Settings</p>
                      <p className="text-sm text-muted-foreground">Display density, motion, and glow profile.</p>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary">Tron</Badge>
                  </div>

                  <SettingsRoundSlider label="Glow Intensity" value={72} />
                  <SettingsRoundSlider label="Grid Visibility" value={64} />

                  <div className="dashboard-settings-toggle-row" role="group" aria-label="Visual toggles">
                    <Button type="button" size="sm" className="dashboard-settings-chip dashboard-settings-chip--active">Scanlines</Button>
                    <Button type="button" size="sm" className="dashboard-settings-chip dashboard-settings-chip--active">Particles</Button>
                    <Button type="button" size="sm" variant="outline" className="dashboard-settings-chip">Low Motion</Button>
                  </div>
                </div>

                <div className="dashboard-settings-control-group">
                  <div>
                    <p className="dashboard-settings-control-heading">Audio Settings</p>
                    <p className="text-sm text-muted-foreground">Mix interface clicks, alerts, and arena feedback.</p>
                  </div>

                  <SettingsRoundSlider label="Master Volume" value={80} />
                  <SettingsRoundSlider label="UI Clicks" value={55} />

                  <div className="dashboard-settings-select-grid">
                    <div className="dashboard-settings-select-field">
                      <span className="dashboard-settings-label">Round Alerts</span>
                      <Select defaultValue="enabled">
                        <SelectTrigger className="dashboard-settings-select" aria-label="Round alerts">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="subtle">Subtle</SelectItem>
                          <SelectItem value="muted">Muted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="dashboard-settings-select-field">
                      <span className="dashboard-settings-label">Victory Pulse</span>
                      <Select defaultValue="enabled">
                        <SelectTrigger className="dashboard-settings-select" aria-label="Victory pulse">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="subtle">Subtle</SelectItem>
                          <SelectItem value="muted">Muted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-panel-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Settings Shortcuts</CardTitle>
                    <CardDescription>Jump to the parts that matter.</CardDescription>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Theme Lab</p>
                  <p className="mt-2 font-semibold text-foreground">Adjust the visual system in UI Lab.</p>
                  <Button asChild variant="outline" className="mt-4 w-full cursor-pointer font-mono uppercase tracking-[0.18em]">
                    <Link href="/ui-lab">Open UI Lab</Link>
                  </Button>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Match Routes</p>
                  <p className="mt-2 font-semibold text-foreground">Quick entry to local or online play.</p>
                  <div className="mt-4 grid gap-2">
                    <Button asChild variant="outline" className="w-full cursor-pointer font-mono uppercase tracking-[0.18em]">
                      <Link href="/local">Local Play</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full cursor-pointer font-mono uppercase tracking-[0.18em]">
                      <Link href={onlineHref}>Online Play</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.profile = el;
          }}
          data-section-id="profile"
          className="scroll-mt-24 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Profile</div>
          <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Profile</CardTitle>
                <CardDescription>Player identity and account settings will live here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Username</p>
                  <p className="mt-1 truncate font-semibold text-foreground">{user.username}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold text-foreground">Active</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
