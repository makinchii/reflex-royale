"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronLeft, Gamepad2, Music2, Paintbrush, Power, UserRound, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthMenu, performLogout } from "@/components/app/auth-menu";
import { DashboardAnalyticsSection } from "@/components/app/dashboard-analytics-section";
import { DashboardPersonalizationSection } from "@/components/app/dashboard-personalization-section";
import { DashboardPlaySection } from "@/components/app/dashboard-play-section";
import { SidebarButton } from "@/components/app/dashboard-controls";
import { DashboardSoundSection } from "@/components/app/dashboard-sound-section";
import { DashboardVisualsSection } from "@/components/app/dashboard-visuals-section";
import {
  ATMOSPHERE_KEY,
  applyPersonalizationTheme,
  clampPercent,
  COOKIE_MAX_AGE,
  formatDuration,
  getThemeCommand,
  INTENSITY_KEY,
  INTENSITY_OPTIONS,
  normalizeCustomThemeColor,
  normalizePersonalizationKey,
  PREFERRED_KEY_KEY,
  resolveTheme,
  saveThemePreferenceWithShades,
  THEME_COMMAND_KEY,
  THEME_COMMANDS,
  THEME_KEY,
  VISUAL_ANIMATIONS_KEY,
  VISUAL_PREFERENCES_CHANGED_EVENT,
  VISUAL_PRESETS,
  type AudioCategoryFilter,
  type LeaderboardEntry,
  type PersonalizationTheme,
  type RecentMatch,
  type TabId,
  type VisualPresetId,
} from "@/components/app/dashboard-settings";
import {
  AUDIO_MASTER_VOLUME_KEY,
  AUDIO_MIX_MODE_KEY,
  AUDIO_MUSIC_VOLUME_KEY,
  AUDIO_PREFERENCES_CHANGED_EVENT,
  AUDIO_ROUND_ALERTS_KEY,
  AUDIO_SFX_VOLUME_KEY,
  AUDIO_VICTORY_PULSE_KEY,
  AUDIO_CUSTOM_TRACK_KEY,
  AUDIO_PLAYLIST,
  fetchAudioPlaylist,
  playUiClick,
  readAudioTogglePreference,
  readAudioCustomTrackPreference,
  readAudioMixModePreference,
  readAudioVolumePreference,
  writeAudioCustomTrackPreference,
  writeAudioMixModePreference,
  writeAudioTogglePreference,
  writeAudioVolumePreference,
  type AudioMixMode,
  type AudioTrack,
} from "@/lib/audio";
import { Button } from "@/components/thegridcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/thegridcn/dialog";
import {
  DEFAULT_ATMOSPHERE,
  applyAtmospherePreset,
  normalizeAtmosphere,
  parseAtmosphere,
  serializeAtmosphere,
  type AtmosphereState,
} from "@/lib/visual-atmosphere";
import type { AppAuthUser } from "@/lib/auth";
import type { PlayerPerformanceStats } from "@/lib/recent-matches";
import { parseIntensity, type Intensity } from "@/lib/ui-preferences";
import {
  THEME_SHADE_COLORS,
  defaultThemeShades,
  getThemeOwnerForColor,
  normalizeThemeCommand,
  normalizeThemeShades,
  type ThemeCommandId,
} from "@/lib/theme-preferences";

type NavItem = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

export function DashboardTabs({
  user,
  userRank,
  performanceStats,
  recentMatches,
  topPlayers,
}: {
  user: AppAuthUser;
  userRank: number;
  performanceStats: PlayerPerformanceStats;
  recentMatches: RecentMatch[];
  topPlayers: LeaderboardEntry[];
}) {
  const [tab, setTab] = useState<TabId>("play");
  const [arenaActive, setArenaActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [preferredKey, setPreferredKey] = useState("");
  const [customThemeColor, setCustomThemeColor] = useState(getThemeCommand("tron").color);
  const [themeCommand, setThemeCommand] = useState<ThemeCommandId>("tron");
  const [themeShadeSelections, setThemeShadeSelections] = useState<Record<ThemeCommandId, string>>(() => defaultThemeShades());
  const [hoveredThemeCommand, setHoveredThemeCommand] = useState<ThemeCommandId | null>(null);
  const [visualIntensity, setVisualIntensity] = useState<Intensity>("light");
  const [visualAtmosphere, setVisualAtmosphere] = useState<AtmosphereState>(() => ({ ...DEFAULT_ATMOSPHERE }));
  const [visualAnimationsEnabled, setVisualAnimationsEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(55);
  const [musicVolume, setMusicVolume] = useState(35);
  const [roundAlertsEnabled, setRoundAlertsEnabled] = useState(true);
  const [victoryPulseEnabled, setVictoryPulseEnabled] = useState(true);
  const [audioMixMode, setAudioMixMode] = useState<AudioMixMode>("default");
  const [customAudioTrackId, setCustomAudioTrackId] = useState("");
  const [audioPlaylist, setAudioPlaylist] = useState<AudioTrack[]>(AUDIO_PLAYLIST);
  const [audioSearch, setAudioSearch] = useState("");
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<AudioCategoryFilter>("all");
  const sectionRefs = useRef<Record<TabId, HTMLElement | null>>({
    play: null,
    analytics: null,
    visuals: null,
    sound: null,
    personalization: null,
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
  const filteredAudioPlaylist = useMemo(() => {
    const query = audioSearch.trim().toLowerCase();
    return audioPlaylist.filter((track) => {
      const matchesCategory = audioCategoryFilter === "all" || track.category === audioCategoryFilter;
      const matchesSearch = !query || `${track.title} ${track.artist}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [audioCategoryFilter, audioPlaylist, audioSearch]);
  const navItems: NavItem[] = [
    { id: "play", label: "Play Now", icon: <Gamepad2 className="h-10 w-7" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-10 w-7" /> },
    { id: "visuals", label: "Visuals", icon: <Paintbrush className="h-10 w-7" /> },
    { id: "sound", label: "Sound", icon: <Music2 className="h-10 w-7" /> },
    { id: "personalization", label: "Personalization", icon: <UserRound className="h-10 w-7" /> },
  ];
  const activeThemeCommand = getThemeCommand(themeCommand);
  const activeThemeShadeColors = THEME_SHADE_COLORS[themeCommand];
  const activeVisualPreset = visualAtmosphere.preset === "custom" ? "custom" : visualAtmosphere.preset;
  const visualIntensityLabel = INTENSITY_OPTIONS.find((option) => option.value === visualIntensity)?.label ?? "Light";

  useEffect(() => {
    setPreferredKey(normalizePersonalizationKey(window.localStorage.getItem(PREFERRED_KEY_KEY) || ""));
    const accountThemeCommand = normalizeThemeCommand(user.preferredThemeCommand || null);
    const command = getThemeCommand(accountThemeCommand);
    const savedColor = normalizeCustomThemeColor(user.preferredThemeColor || command.color);
    const shades = normalizeThemeShades(user.preferredThemeShades);
    const color = THEME_SHADE_COLORS[command.id].some((shade) => shade.toLowerCase() === savedColor.toLowerCase()) ? savedColor : shades[command.id];
    shades[command.id] = color;
    setThemeShadeSelections(shades);
    setCustomThemeColor(color);
    setThemeCommand(command.id);
    applyPersonalizationTheme(resolveTheme(command, color), color, command.id);
  }, [user.preferredThemeColor, user.preferredThemeCommand, user.preferredThemeShades]);

  useEffect(() => {
    const syncVisualSettings = () => {
      const storedIntensity = window.localStorage.getItem(INTENSITY_KEY);
      const storedAtmosphere = window.localStorage.getItem(ATMOSPHERE_KEY);
      const storedAnimations = window.localStorage.getItem(VISUAL_ANIMATIONS_KEY);
      setVisualIntensity(parseIntensity(storedIntensity ?? undefined));
      setVisualAtmosphere(parseAtmosphere(storedAtmosphere));
      setVisualAnimationsEnabled(storedAnimations !== "false");
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === INTENSITY_KEY || event.key === ATMOSPHERE_KEY || event.key === VISUAL_ANIMATIONS_KEY) syncVisualSettings();
    };

    syncVisualSettings();
    window.addEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncVisualSettings);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncVisualSettings);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    const syncAudioSettings = () => {
      setMasterVolume(Math.round(readAudioVolumePreference(AUDIO_MASTER_VOLUME_KEY, 0.8) * 100));
      setSfxVolume(Math.round(readAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, 0.55) * 100));
      setMusicVolume(Math.round(readAudioVolumePreference(AUDIO_MUSIC_VOLUME_KEY, 0.35) * 100));
      setRoundAlertsEnabled(readAudioTogglePreference(AUDIO_ROUND_ALERTS_KEY, true));
      setVictoryPulseEnabled(readAudioTogglePreference(AUDIO_VICTORY_PULSE_KEY, true));
      setAudioMixMode(readAudioMixModePreference());
      setCustomAudioTrackId(readAudioCustomTrackPreference());
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (
        event.key === AUDIO_MASTER_VOLUME_KEY ||
        event.key === AUDIO_SFX_VOLUME_KEY ||
        event.key === AUDIO_MUSIC_VOLUME_KEY ||
        event.key === AUDIO_ROUND_ALERTS_KEY ||
        event.key === AUDIO_VICTORY_PULSE_KEY ||
        event.key === AUDIO_MIX_MODE_KEY ||
        event.key === AUDIO_CUSTOM_TRACK_KEY
      ) {
        syncAudioSettings();
      }
    };

    syncAudioSettings();
    window.addEventListener(AUDIO_PREFERENCES_CHANGED_EVENT, syncAudioSettings);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(AUDIO_PREFERENCES_CHANGED_EVENT, syncAudioSettings);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAudioPlaylist()
      .then((tracks) => {
        if (!cancelled) setAudioPlaylist(tracks);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function choosePreferredKey(key: string) {
    const normalized = normalizePersonalizationKey(key);
    if (!normalized) return;
    playUiClick();
    setPreferredKey(normalized);
    window.localStorage.setItem(PREFERRED_KEY_KEY, normalized);
  }

  function chooseThemeCommand(commandId: ThemeCommandId) {
    const command = getThemeCommand(commandId);
    playUiClick();
    setThemeCommand(command.id);
    const color = themeShadeSelections[command.id] || command.color;
    setCustomThemeColor(color);
    applyPersonalizationTheme(resolveTheme(command, color), color, command.id);
    saveThemePreferenceWithShades({ id: command.id, color }, themeShadeSelections);
  }

  function chooseThemeColor(color: string) {
    playUiClick();
    const nextShades = { ...themeShadeSelections, [activeThemeCommand.id]: color };
    setThemeShadeSelections(nextShades);
    setCustomThemeColor(color);
    applyPersonalizationTheme(resolveTheme(activeThemeCommand, color), color, activeThemeCommand.id);
    saveThemePreferenceWithShades({ id: activeThemeCommand.id, color }, nextShades);
  }

  function chooseThemeFromBlockedColor(color: string, owner: string) {
    const ownerCommandId = normalizeThemeCommand(owner);
    const ownerCommand = getThemeCommand(ownerCommandId);
    playUiClick();
    const nextShades = { ...themeShadeSelections, [ownerCommand.id]: color };
    setThemeShadeSelections(nextShades);
    setThemeCommand(ownerCommand.id);
    setCustomThemeColor(color);
    applyPersonalizationTheme(resolveTheme(ownerCommand, color), color, ownerCommand.id);
    saveThemePreferenceWithShades({ id: ownerCommand.id, color }, nextShades);
  }

  function resetThemeShade() {
    const color = activeThemeCommand.color;
    playUiClick();
    const nextShades = { ...themeShadeSelections, [activeThemeCommand.id]: color };
    setThemeShadeSelections(nextShades);
    setCustomThemeColor(color);
    applyPersonalizationTheme(activeThemeCommand.theme, color, activeThemeCommand.id);
    saveThemePreferenceWithShades({ id: activeThemeCommand.id, color }, nextShades);
  }

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

  function persistVisualSettings(intensity: Intensity, atmosphere: AtmosphereState) {
    const serialized = serializeAtmosphere(atmosphere);
    setVisualIntensity(intensity);
    setVisualAtmosphere(atmosphere);
    window.localStorage.setItem(INTENSITY_KEY, intensity);
    window.localStorage.setItem(ATMOSPHERE_KEY, serialized);
    document.cookie = `${INTENSITY_KEY}=${intensity}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${ATMOSPHERE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.dataset.tronIntensity = intensity;
    document.body.dataset.tronIntensity = intensity;
    window.dispatchEvent(new CustomEvent(VISUAL_PREFERENCES_CHANGED_EVENT));
  }

  function toggleVisualAnimations() {
    playUiClick();
    const nextEnabled = !visualAnimationsEnabled;
    setVisualAnimationsEnabled(nextEnabled);
    window.localStorage.setItem(VISUAL_ANIMATIONS_KEY, String(nextEnabled));
    document.cookie = `${VISUAL_ANIMATIONS_KEY}=${nextEnabled}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    window.dispatchEvent(new CustomEvent(VISUAL_PREFERENCES_CHANGED_EVENT));
  }

  function chooseVisualPreset(preset: VisualPresetId) {
    const command = VISUAL_PRESETS.find((item) => item.id === preset) ?? VISUAL_PRESETS[1];
    playUiClick();
    persistVisualSettings(command.intensity, applyAtmospherePreset(command.id));
  }

  function changeVisualIntensity(intensity: Intensity) {
    playUiClick();
    persistVisualSettings(intensity, visualAtmosphere);
  }

  function updateVisualAtmosphere(nextAtmosphere: Partial<AtmosphereState>) {
    const atmosphere = normalizeAtmosphere({ ...visualAtmosphere, ...nextAtmosphere, preset: "custom" });
    persistVisualSettings(visualIntensity, atmosphere);
  }

  function changeAudioVolume(key: string, updateValue: (value: number) => void, value: number) {
    updateValue(value);
    writeAudioVolumePreference(key, value / 100);
  }

  function toggleAudioSetting(key: string, enabled: boolean, updateValue: (value: boolean) => void) {
    playUiClick();
    const nextEnabled = !enabled;
    updateValue(nextEnabled);
    writeAudioTogglePreference(key, nextEnabled);
  }

  function changeAudioMixMode(mode: AudioMixMode) {
    playUiClick();
    setAudioMixMode(mode);
    writeAudioMixModePreference(mode);
  }

  function selectAudioTrack(trackId: string) {
    playUiClick();
    setCustomAudioTrackId(trackId);
    setAudioMixMode("custom");
    writeAudioCustomTrackPreference(trackId);
    writeAudioMixModePreference("custom");
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

        <DashboardPlaySection
          arenaActive={arenaActive}
          customThemeColor={customThemeColor}
          setArenaActive={setArenaActive}
          setSectionRef={(el) => {
            sectionRefs.current.play = el;
          }}
          themeCommand={themeCommand}
          visualAnimationsEnabled={visualAnimationsEnabled}
        />

        <DashboardAnalyticsSection
          leaderboardRows={leaderboardRows}
          performanceMetrics={performanceMetrics}
          recentMatches={recentMatches}
          setSectionRef={(el) => {
            sectionRefs.current.analytics = el;
          }}
        />

        <DashboardVisualsSection
          activeVisualPreset={activeVisualPreset}
          changeVisualIntensity={changeVisualIntensity}
          chooseVisualPreset={chooseVisualPreset}
          setSectionRef={(el) => {
            sectionRefs.current.visuals = el;
          }}
          toggleVisualAnimations={toggleVisualAnimations}
          updateVisualAtmosphere={updateVisualAtmosphere}
          visualAnimationsEnabled={visualAnimationsEnabled}
          visualAtmosphere={visualAtmosphere}
          visualIntensity={visualIntensity}
          visualIntensityLabel={visualIntensityLabel}
        />

        <DashboardSoundSection
          audioCategoryFilter={audioCategoryFilter}
          audioMixMode={audioMixMode}
          audioSearch={audioSearch}
          customAudioTrackId={customAudioTrackId}
          filteredAudioPlaylist={filteredAudioPlaylist}
          masterVolume={masterVolume}
          musicVolume={musicVolume}
          onAudioCategoryFilterChange={(category) => {
            playUiClick();
            setAudioCategoryFilter(category);
          }}
          onAudioMixModeChange={changeAudioMixMode}
          onAudioSearchChange={setAudioSearch}
          onMasterVolumeChange={(value) => changeAudioVolume(AUDIO_MASTER_VOLUME_KEY, setMasterVolume, value)}
          onMusicVolumeChange={(value) => changeAudioVolume(AUDIO_MUSIC_VOLUME_KEY, setMusicVolume, value)}
          onRoundAlertsToggle={() => toggleAudioSetting(AUDIO_ROUND_ALERTS_KEY, roundAlertsEnabled, setRoundAlertsEnabled)}
          onSelectAudioTrack={selectAudioTrack}
          onSfxVolumeChange={(value) => changeAudioVolume(AUDIO_SFX_VOLUME_KEY, setSfxVolume, value)}
          onVictoryPulseToggle={() => toggleAudioSetting(AUDIO_VICTORY_PULSE_KEY, victoryPulseEnabled, setVictoryPulseEnabled)}
          roundAlertsEnabled={roundAlertsEnabled}
          setSectionRef={(el) => {
            sectionRefs.current.sound = el;
          }}
          sfxVolume={sfxVolume}
          victoryPulseEnabled={victoryPulseEnabled}
        />

        <DashboardPersonalizationSection
          activeThemeCommand={activeThemeCommand}
          activeThemeShadeColors={activeThemeShadeColors}
          choosePreferredKey={choosePreferredKey}
          chooseThemeColor={chooseThemeColor}
          chooseThemeCommand={chooseThemeCommand}
          chooseThemeFromBlockedColor={chooseThemeFromBlockedColor}
          customThemeColor={customThemeColor}
          getColorOwner={getThemeOwnerForColor}
          hoveredThemeCommand={hoveredThemeCommand}
          onThemeColorHover={(owner) => setHoveredThemeCommand(owner ? normalizeThemeCommand(owner) : null)}
          preferredKey={preferredKey}
          resetThemeShade={resetThemeShade}
          setSectionRef={(el) => {
            sectionRefs.current.personalization = el;
          }}
          themeCommand={themeCommand}
          themeShadeSelections={themeShadeSelections}
        />
      </div>
    </div>
  );
}
