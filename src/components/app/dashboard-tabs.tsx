"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, ChevronLeft, Gamepad2, Globe2, Power, RadioTower, Settings2, ShieldCheck, Timer, Trophy, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { performLogout } from "@/components/app/auth-menu";
import { Badge } from "@/components/thegridcn/badge";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/thegridcn/dialog";
import type { AppAuthUser } from "@/lib/auth";

type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

type TabId = "playing" | "analytics" | "settings" | "profile";

type NavItem = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

function rankColor(rank: number) {
  if (rank === 1) return "#D4AF37";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return undefined;
}

function SidebarButton({ active, collapsed, icon, label, onClick }: { active: boolean; collapsed: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      title={label}
      className={`group relative grid h-10 w-full grid-cols-[5rem_minmax(0,1fr)] items-center overflow-hidden text-left transition-colors duration-300 ${
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

export function DashboardTabs({
  user,
  userRank,
  playNowHref,
  onlineHref,
  topPlayers,
}: {
  user: AppAuthUser;
  userRank: number;
  playNowHref: string;
  onlineHref: string;
  topPlayers: LeaderboardEntry[];
}) {
  const [tab, setTab] = useState<TabId>("playing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sectionRefs = useRef<Record<TabId, HTMLElement | null>>({
    playing: null,
    analytics: null,
    settings: null,
    profile: null,
  });
  const router = useRouter();

  const leaderboardRows = useMemo(() => Array.from({ length: 10 }, (_, index) => topPlayers[index] ?? null), [topPlayers]);
  const navItems: NavItem[] = [
    { id: "playing", label: "Playing", icon: <Gamepad2 className="h-10 w-7" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-10 w-7" /> },
    { id: "settings", label: "Settings", icon: <Settings2 className="h-10 w-7" /> },
    { id: "profile", label: "Profile", icon: <UserRound className="h-10 w-7" /> },
  ];

  const activityFeed = [
    { title: "Session ready", description: "Dashboard resolved before render and auth state is active.", meta: "LIVE" },
    { title: "Best score locked", description: user.bestScore > 0 ? `${user.bestScore} ms registered as your best run.` : "No score registered yet.", meta: "PLAYER" },
    { title: "Online gate", description: "Protected online rooms require authenticated access.", meta: "SECURE" },
    { title: "Leaderboard sync", description: "Top player standings are pulled from MongoDB on load.", meta: "SYNC" },
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
    setTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid flex-1 items-stretch gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={`hidden min-h-[calc(100svh-12rem)] overflow-hidden transition-[width] duration-300 ease-out md:flex md:flex-col md:rounded md:border md:border-primary/25 md:bg-background/80 md:backdrop-blur-xl ${
          sidebarCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
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
            onClick={() => setSidebarCollapsed((value) => !value)}
            className={`${sidebarCollapsed ? "w-full" : ""} flex items-center justify-center rounded p-1.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary`}
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
              <button type="button" className="group relative grid h-10 w-full grid-cols-[5rem_minmax(0,1fr)] items-center overflow-hidden text-left text-muted-foreground transition-colors duration-300 hover:bg-primary/5 hover:text-primary" title="Power options">
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

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 rounded border border-primary/20 bg-card/15 p-2 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${
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
            sectionRefs.current.playing = el;
          }}
          data-section-id="playing"
          className="scroll-mt-24 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Playing</div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
            <Card className="border-primary/35 bg-card/15 backdrop-blur-xl">
              <CardContent className="px-6 py-8 sm:px-10 sm:py-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-[0.14em] text-primary sm:text-6xl lg:text-7xl [text-shadow:0_0_80px_oklch(from_var(--primary)_l_c_h/0.45),0_0_160px_oklch(from_var(--primary)_l_c_h/0.25)]">
                      Choose your arena.
                    </h1>
                    <p className="mt-4 max-w-2xl font-mono text-sm leading-7 text-muted-foreground sm:text-base">
                      Launch a match, assess the competition, or search for adversaries across the universe.
                    </p>
                  </div>
                </div>

                <div className="mt-40 flex flex-wrap gap-4">
                  <Button asChild size="lg" className="h-24 min-w-[20rem] cursor-pointer border border-primary bg-primary/20 px-12 text-2xl font-bold uppercase tracking-[0.26em] text-primary shadow-[var(--tron-border-glow)] hover:bg-primary/30">
                    <Link href={playNowHref}>Local Play</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-24 min-w-[18rem] cursor-pointer border-primary/35 bg-card/30 px-10 text-xl font-semibold uppercase tracking-[0.22em] text-foreground/70 shadow-[var(--tron-border-glow)] hover:border-primary/60 hover:bg-primary/10 hover:text-primary">
                    <Link href={onlineHref}>
                      <Globe2 className="h-10 w-10" />
                      Online Play
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-background/80 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="uppercase tracking-[0.08em]">Top Players</CardTitle>
                    <CardDescription>Top players from the current season.</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                {leaderboardRows.map((entry, index) => {
                  const rank = index + 1;
                  const color = rankColor(rank);
                  return (
                    <div key={`slot-${rank}`} className="flex items-center justify-between rounded border border-primary/20 bg-primary/5 px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={color ? { color } : undefined}>#{rank}</p>
                      <p className="max-w-[55%] truncate font-display text-base uppercase tracking-[0.08em] text-foreground">{entry ? entry.username : "---"}</p>
                      <p className="font-mono text-sm" style={color ? { color } : undefined}>{entry ? (entry.bestScore > 0 ? `${entry.bestScore} ms` : "No score") : "---"}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.analytics = el;
          }}
          data-section-id="analytics"
          className="scroll-mt-24 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Analytics</div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]">
            <Card className="border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="uppercase tracking-[0.08em]">Performance</CardTitle>
                    <CardDescription>Season position and signal health.</CardDescription>
                  </div>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Current Rank</p>
                  <p className="mt-2 font-display text-4xl uppercase tracking-[0.08em] text-primary">{userRank >= 0 ? `#${userRank + 1}` : "--"}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Best Score</p>
                  <p className="mt-2 font-display text-4xl uppercase tracking-[0.08em] text-primary">{user.bestScore > 0 ? `${user.bestScore}` : "--"}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Player Handle</p>
                  <p className="mt-2 truncate text-lg font-semibold text-foreground">{user.username}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Protected command center</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="uppercase tracking-[0.08em]">Recent Activity</CardTitle>
                    <CardDescription>What the system is tracking right now.</CardDescription>
                  </div>
                  <RadioTower className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityFeed.map((item) => (
                  <div key={item.title} className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{item.meta}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.settings = el;
          }}
          data-section-id="settings"
          className="scroll-mt-24 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Settings</div>
          <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
            <Card className="border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="uppercase tracking-[0.08em]">Session Summary</CardTitle>
                    <CardDescription>Current identity and controls.</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Player</p>
                  <p className="mt-1 truncate font-semibold text-foreground">{user.username}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Best Score</p>
                  <p className="mt-1 font-semibold text-foreground">{user.bestScore > 0 ? `${user.bestScore} ms` : "Unranked"}</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rank</p>
                  <p className="mt-1 font-semibold text-foreground">{userRank >= 0 ? `#${userRank + 1}` : "--"}</p>
                </div>

                <Button asChild className="mt-2 w-full cursor-pointer font-mono uppercase tracking-[0.2em]">
                  <Link href={playNowHref}>
                    <ArrowRight className="h-4 w-4" />
                    Play Now!
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="uppercase tracking-[0.08em]">Settings Shortcuts</CardTitle>
                    <CardDescription>Jump to the parts that matter.</CardDescription>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
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
                      <Link href="/play">Local Play</Link>
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
                <CardTitle className="uppercase tracking-[0.08em]">Profile</CardTitle>
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
