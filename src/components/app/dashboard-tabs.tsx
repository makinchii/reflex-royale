"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronLeft, Gamepad2, Gauge, Music2, Navigation, Paintbrush, Play, Power, RadioTower, Search, SlidersHorizontal, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthMenu, performLogout } from "@/components/app/auth-menu";
import { WireframeDottedGlobe } from "@/components/app/wireframe-dotted-globe";
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
  type AudioCategory,
  type AudioMixMode,
  type AudioTrack,
} from "@/lib/audio";
import { Badge } from "@/components/thegridcn/badge";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/thegridcn/dialog";
import { Input } from "@/components/thegridcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/thegridcn/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/thegridcn/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/thegridcn/tooltip";
import { HexColorPicker } from "@/components/thegridcn/hex-color-picker";
import {
  DEFAULT_ATMOSPHERE,
  applyAtmospherePreset,
  normalizeAtmosphere,
  parseAtmosphere,
  serializeAtmosphere,
  type AtmospherePreset,
  type AtmosphereState,
} from "@/app/ui-lab/atmosphere";
import type { AppAuthUser } from "@/lib/auth";
import type { PlayerPerformanceStats } from "@/lib/recent-matches";
import { parseIntensity, type Intensity } from "@/lib/ui-preferences";
import {
  THEME_COMMAND_COLORS,
  THEME_SHADE_COLORS,
  defaultThemeShades,
  getThemeOwnerForColor,
  normalizeThemeCommand,
  normalizeThemeShades,
  type ThemeCommandId,
} from "@/lib/theme-preferences";

type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

type TabId = "play" | "analytics" | "visuals" | "sound" | "personalization";
type PersonalizationTheme = "tron" | "ares" | "custom";

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

type AudioCategoryFilter = "all" | AudioCategory;
type VisualPresetId = Exclude<AtmospherePreset, "custom">;

const PREFERRED_KEY_KEY = "reflexRoyalePreferredKey";
const THEME_KEY = "ui-lab-theme";
const INTENSITY_KEY = "ui-lab-intensity";
const ATMOSPHERE_KEY = "ui-lab-atmosphere";
const VISUAL_ANIMATIONS_KEY = "reflexRoyaleVisualAnimationsEnabled";
const VISUAL_PREFERENCES_CHANGED_EVENT = "reflexRoyaleVisualPreferencesChanged";
const CUSTOM_THEME_COLOR_KEY = "reflexRoyaleCustomThemeColor";
const THEME_COMMAND_KEY = "reflexRoyaleThemeCommand";
const COOKIE_MAX_AGE = 31_536_000;
const VISUAL_PRESETS: Array<{ id: VisualPresetId; label: string; description: string; intensity: Intensity }> = [
  { id: "calm", label: "Calm", description: "Reduced motion with softer background traffic.", intensity: "light" },
  { id: "balanced", label: "Balanced", description: "Default density for command-center readability.", intensity: "medium" },
  { id: "electric", label: "Electric", description: "Maximum grid pressure, particles, and beams.", intensity: "heavy" },
];
const INTENSITY_OPTIONS: Array<{ value: Intensity; label: string; description: string }> = [
  { value: "none", label: "Minimal", description: "Disable animated grid effects." },
  { value: "light", label: "Light", description: "Low-glow dashboard baseline." },
  { value: "medium", label: "Medium", description: "Balanced neon response." },
  { value: "heavy", label: "Heavy", description: "High-output arcade glow." },
];
const THEME_COMMANDS: Array<{ id: ThemeCommandId; name: string; color: string; protocol: string; theme: PersonalizationTheme }> = [
  { id: "ares", name: "ARES", color: THEME_COMMAND_COLORS.ares, protocol: "Red combat protocol", theme: "ares" },
  { id: "vulcan", name: "VULCAN", color: THEME_COMMAND_COLORS.vulcan, protocol: "Orange forge protocol", theme: "custom" },
  { id: "apollo", name: "APOLLO", color: THEME_COMMAND_COLORS.apollo, protocol: "Yellow solar protocol", theme: "custom" },
  { id: "gaia", name: "GAIA", color: THEME_COMMAND_COLORS.gaia, protocol: "Green biosphere protocol", theme: "custom" },
  { id: "tron", name: "TRON", color: THEME_COMMAND_COLORS.tron, protocol: "Blue grid protocol", theme: "tron" },
  { id: "bacchus", name: "BACCHUS", color: THEME_COMMAND_COLORS.bacchus, protocol: "Purple pulse protocol", theme: "custom" },
  { id: "aphrodite", name: "APHRODITE", color: THEME_COMMAND_COLORS.aphrodite, protocol: "Pink signal protocol", theme: "custom" },
  { id: "olympus", name: "OLYMPUS", color: THEME_COMMAND_COLORS.olympus, protocol: "White ascendant protocol", theme: "custom" },
];
const PERSONALIZATION_KEYBOARD_ROWS = Object.freeze([
  Object.freeze(["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]),
  Object.freeze(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"]),
  Object.freeze(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"]),
  Object.freeze(["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]),
]);
const PERSONALIZATION_ALLOWED_KEYS = new Set(PERSONALIZATION_KEYBOARD_ROWS.flat());
const PERSONALIZATION_SHIFTED_KEYS: Record<string, string> = {
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  "\"": "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

function normalizePersonalizationKey(value: string) {
  if (value.length !== 1) return "";
  const lower = value.toLowerCase();
  const normalized = PERSONALIZATION_SHIFTED_KEYS[lower] || lower;
  return PERSONALIZATION_ALLOWED_KEYS.has(normalized) ? normalized : "";
}

function normalizeCustomThemeColor(value: string | null) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : getThemeCommand("tron").color;
}

function getThemeCommand(id: ThemeCommandId) {
  return THEME_COMMANDS.find((command) => command.id === id) ?? THEME_COMMANDS.find((command) => command.id === "tron")!;
}

function resolveTheme(command: { theme: PersonalizationTheme; color: string }, color: string): PersonalizationTheme {
  return color.toLowerCase() === command.color.toLowerCase() ? command.theme : "custom";
}

function applyCustomThemeColor(color: string) {
  [document.documentElement, document.body].forEach((node) => {
    node.style.setProperty("--primary", color);
    node.style.setProperty("--accent", color);
    node.style.setProperty("--ring", color);
    node.style.setProperty("--border", `color-mix(in oklch, ${color} 42%, black)`);
    node.style.setProperty("--input", `color-mix(in oklch, ${color} 26%, black)`);
    node.style.setProperty("--glow", color);
    node.style.setProperty("--glow-muted", `color-mix(in oklch, ${color} 56%, black)`);
    node.style.setProperty("--sidebar-primary", color);
    node.style.setProperty("--sidebar-border", `color-mix(in oklch, ${color} 42%, black)`);
    node.style.setProperty("--sidebar-ring", color);
  });
}

function clearCustomThemeColor() {
  [document.documentElement, document.body].forEach((node) => {
    ["--primary", "--accent", "--ring", "--border", "--input", "--glow", "--glow-muted", "--sidebar-primary", "--sidebar-border", "--sidebar-ring"].forEach((property) => {
      node.style.removeProperty(property);
    });
  });
}

function applyPersonalizationTheme(theme: PersonalizationTheme, customColor = getThemeCommand("tron").color, commandId: ThemeCommandId = "tron") {
  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(THEME_COMMAND_KEY, commandId);
  document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  document.cookie = `${THEME_COMMAND_KEY}=${commandId}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  if (theme === "custom") {
    window.localStorage.setItem(CUSTOM_THEME_COLOR_KEY, customColor);
    document.cookie = `${CUSTOM_THEME_COLOR_KEY}=${customColor}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } else {
    window.localStorage.removeItem(CUSTOM_THEME_COLOR_KEY);
    document.cookie = `${CUSTOM_THEME_COLOR_KEY}=; path=/; max-age=0; samesite=lax`;
  }
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  if (theme === "custom") applyCustomThemeColor(customColor);
  else clearCustomThemeColor();
  window.__reflexRoyaleSetFavicon?.();
}

function saveThemePreferenceWithShades(command: { id: ThemeCommandId; color: string }, shades: Record<ThemeCommandId, string>) {
  void fetch("/api/auth/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preferredThemeCommand: command.id,
      preferredThemeColor: command.color,
      preferredThemeShades: shades,
    }),
  });
}

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

function formatAudioTrackDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function valueToPercent(value: number, min: number, max: number) {
  return clampPercent(((value - min) / (max - min)) * 100);
}

function percentToValue(percent: number, min: number, max: number) {
  return min + (clampPercent(percent) / 100) * (max - min);
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

function SettingsRoundSlider({ label, value, onChange }: { label: string; value: number; onChange?: (value: number) => void }) {
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
        <input
          className="round-slider__input"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(event) => onChange?.(Number(event.currentTarget.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function AudioSettingsToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`dashboard-settings-toggle ${enabled ? "dashboard-settings-toggle--active" : ""}`} aria-pressed={enabled} onClick={onToggle}>
      <span>{label}</span>
      <strong>{enabled ? "Enabled" : "Muted"}</strong>
    </button>
  );
}

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
            sectionRefs.current.visuals = el;
          }}
          data-section-id="visuals"
          className="dashboard-settings-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Visuals</div>
          <div className="dashboard-settings-grid grid gap-5">
            <div className="dashboard-visuals-grid">
              <Card className="dashboard-panel-card dashboard-visual-general-card border-primary/25 bg-card/15 backdrop-blur-xl">
                <CardHeader className="dashboard-panel-card-header">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">General Settings</CardTitle>
                      <CardDescription>Choose a fast visual profile for the whole command shell.</CardDescription>
                    </div>
                    <Gauge className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="dashboard-panel-card-content dashboard-visual-general-content">
                  <div className="dashboard-visual-preset-card">
                    <div className="dashboard-visual-card-heading">
                      <span>Visual Presets</span>
                      <strong>{activeVisualPreset === "custom" ? "Custom" : activeVisualPreset}</strong>
                    </div>
                    <div className="dashboard-visual-preset-grid" role="group" aria-label="Visual Presets">
                      {VISUAL_PRESETS.map((preset) => {
                        const presetAtmosphere = applyAtmospherePreset(preset.id);
                        return (
                          <button key={preset.id} type="button" className={visualAtmosphere.preset === preset.id ? "is-active" : undefined} onClick={() => chooseVisualPreset(preset.id)}>
                            <span>{preset.label}</span>
                            <small>{preset.description}</small>
                            <div className="dashboard-visual-preset-metrics" aria-hidden="true">
                              <em>{preset.intensity}</em>
                              <em>{presetAtmosphere.particleCount} particles</em>
                              <em>{Math.round(presetAtmosphere.beamOpacity * 100)}% beams</em>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="dashboard-visual-intensity-field">
                      <span className="dashboard-settings-label">Glow Intensity</span>
                      <Select value={visualIntensity} onValueChange={(value) => changeVisualIntensity(value as Intensity)}>
                        <SelectTrigger className="dashboard-settings-select" aria-label="Glow intensity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTENSITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="dashboard-visual-summary-grid">
                      <div>
                        <span>Intensity</span>
                        <strong>{visualIntensityLabel}</strong>
                      </div>
                      <div>
                        <span>Particles</span>
                        <strong>{visualIntensity === "none" ? "Off" : visualAtmosphere.particleCount}</strong>
                      </div>
                    </div>
                    <button type="button" className={`dashboard-visual-animation-toggle ${!visualAnimationsEnabled ? "is-active" : ""}`} aria-pressed={!visualAnimationsEnabled} onClick={toggleVisualAnimations}>
                      <span>Disable Animations</span>
                      <strong>{visualAnimationsEnabled ? "Off" : "On"}</strong>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-panel-card dashboard-visual-advanced-card border-primary/25 bg-card/15 backdrop-blur-xl">
                <CardHeader className="dashboard-panel-card-header">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Advanced Settings</CardTitle>
                      <CardDescription>Tweak the grid, motion, particles, and beam renderer.</CardDescription>
                    </div>
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="dashboard-panel-card-content dashboard-settings-controls dashboard-visual-advanced-content">
                  <div className="dashboard-settings-control-group dashboard-visual-advanced-group">
                    <SettingsRoundSlider label="Grid Visibility" value={valueToPercent(visualAtmosphere.visibility, 0.2, 1.5)} onChange={(value) => updateVisualAtmosphere({ visibility: percentToValue(value, 0.2, 1.5) })} />
                    <SettingsRoundSlider label="Scene Sway" value={valueToPercent(visualAtmosphere.sway, 0, 1)} onChange={(value) => updateVisualAtmosphere({ sway: value / 100 })} />
                    <SettingsRoundSlider label="Drift Speed" value={valueToPercent(visualAtmosphere.swaySpeed, 0, 1)} onChange={(value) => updateVisualAtmosphere({ swaySpeed: value / 100 })} />
                    <SettingsRoundSlider label="Particle Density" value={valueToPercent(visualAtmosphere.particleCount, 0, 500)} onChange={(value) => updateVisualAtmosphere({ particleCount: Math.round((value / 100) * 500) })} />
                    <SettingsRoundSlider label="Particle Glow" value={valueToPercent(visualAtmosphere.particleOpacity, 0, 1)} onChange={(value) => updateVisualAtmosphere({ particleOpacity: value / 100 })} />
                    <SettingsRoundSlider label="Beam Glow" value={valueToPercent(visualAtmosphere.beamOpacity, 0, 1)} onChange={(value) => updateVisualAtmosphere({ beamOpacity: value / 100 })} />
                    <SettingsRoundSlider label="Beam Width" value={valueToPercent(visualAtmosphere.beamThickness, 0.02, 0.08)} onChange={(value) => updateVisualAtmosphere({ beamThickness: percentToValue(value, 0.02, 0.08) })} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.sound = el;
          }}
          data-section-id="sound"
          className="dashboard-settings-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Sound</div>
          <div className="dashboard-settings-grid grid gap-5">
            <div className="dashboard-settings-category">
              <div className="dashboard-settings-category__heading">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Sound</p>
                  <p className="mt-1 text-sm text-muted-foreground">Control the music player and game audio mix.</p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">Live audio</Badge>
              </div>

              <div className="dashboard-sound-grid grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
                <Card className="dashboard-panel-card dashboard-sound-player-card border-primary/25 bg-card/15 backdrop-blur-xl">
                  <CardHeader className="dashboard-panel-card-header">
                    <div>
                      <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Music Player</CardTitle>
                      <CardDescription>Shared grid soundtrack and waveform monitor.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="dashboard-panel-card-content dashboard-sound-player-slot" />
                </Card>

                <Card className="dashboard-panel-card dashboard-audio-settings-card border-primary/25 bg-card/15 backdrop-blur-xl">
                  <CardHeader className="dashboard-panel-card-header">
                    <div>
                      <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Audio Settings</CardTitle>
                      <CardDescription>Mix interface clicks, alerts, and arena feedback.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="dashboard-panel-card-content dashboard-settings-controls dashboard-audio-settings-content">
                    <div className="dashboard-settings-control-group dashboard-audio-settings-group">
                      <SettingsRoundSlider label="Master Volume" value={masterVolume} onChange={(value) => changeAudioVolume(AUDIO_MASTER_VOLUME_KEY, setMasterVolume, value)} />
                      <SettingsRoundSlider label="SFX Volume" value={sfxVolume} onChange={(value) => changeAudioVolume(AUDIO_SFX_VOLUME_KEY, setSfxVolume, value)} />
                      <SettingsRoundSlider label="Music Volume" value={musicVolume} onChange={(value) => changeAudioVolume(AUDIO_MUSIC_VOLUME_KEY, setMusicVolume, value)} />

                      <div className="dashboard-settings-toggle-list">
                        <AudioSettingsToggle label="Round Alerts" enabled={roundAlertsEnabled} onToggle={() => toggleAudioSetting(AUDIO_ROUND_ALERTS_KEY, roundAlertsEnabled, setRoundAlertsEnabled)} />
                        <AudioSettingsToggle label="Victory Pulse" enabled={victoryPulseEnabled} onToggle={() => toggleAudioSetting(AUDIO_VICTORY_PULSE_KEY, victoryPulseEnabled, setVictoryPulseEnabled)} />
                      </div>

                      <div className="dashboard-audio-mix-field">
                        <span className="dashboard-settings-label">Mix</span>
                        <Select value={audioMixMode} onValueChange={(value) => changeAudioMixMode(value as AudioMixMode)}>
                          <SelectTrigger className="dashboard-settings-select" aria-label="Audio mix mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="lobby">Lobby</SelectItem>
                            <SelectItem value="battle">Battle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="dashboard-audio-catalog" aria-label="Audio Catalog">
                        <div className="dashboard-audio-catalog__header">
                          <span>Audio Catalog</span>
                          <strong>{filteredAudioPlaylist.length} tracks</strong>
                        </div>
                        <div className="dashboard-audio-catalog-search">
                          <Search className="h-4 w-4" aria-hidden="true" />
                          <Input value={audioSearch} onChange={(event) => setAudioSearch(event.currentTarget.value)} placeholder="Search songs or artists" aria-label="Search audio catalog" />
                        </div>
                        <div className="dashboard-audio-catalog-filters" role="group" aria-label="Filter music category">
                          {(["all", "lobby", "battle"] as AudioCategoryFilter[]).map((category) => (
                            <button key={category} type="button" className={audioCategoryFilter === category ? "is-active" : undefined} onClick={() => { playUiClick(); setAudioCategoryFilter(category); }}>
                              {category === "all" ? "All" : category}
                            </button>
                          ))}
                        </div>
                        <div className="dashboard-audio-catalog-list" role="list">
                          {filteredAudioPlaylist.map((track) => {
                            const selected = customAudioTrackId === track.trackId && audioMixMode === "custom";
                            return (
                              <button key={track.trackId} type="button" className={`dashboard-audio-catalog-row ${selected ? "is-active" : ""}`} onClick={() => selectAudioTrack(track.trackId)} role="listitem">
                                <span className="dashboard-audio-catalog-row__thumb">
                                  {track.coverImage ? <img src={track.coverImage} alt="" /> : <Music2 className="h-4 w-4" />}
                                </span>
                                <span className="dashboard-audio-catalog-row__meta">
                                  <strong>{track.title}</strong>
                                  <small>{track.artist}</small>
                                </span>
                                <Badge variant="outline" className="dashboard-audio-catalog-row__category">{track.category}</Badge>
                                <span className="dashboard-audio-catalog-row__action">
                                  <span className="dashboard-audio-catalog-row__duration">{formatAudioTrackDuration(track.durationSeconds)}</span>
                                  <span className="dashboard-audio-catalog-row__play"><Play className="h-3.5 w-3.5" /></span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.personalization = el;
          }}
          data-section-id="personalization"
          className="dashboard-personalization-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
        >
          <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Personalization</div>
          <div className="dashboard-personalization-grid grid gap-5 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]">
            <Card className="dashboard-panel-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Preferred Key</CardTitle>
                <CardDescription>Your online lobby default. Auto-selects in online lobbies if available.</CardDescription>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content dashboard-personalization-key-card">
                <div className="dashboard-personalization-readout">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Default Online Key</p>
                    <p className="mt-2 font-display text-5xl uppercase tracking-[0.2em] text-primary">{preferredKey ? preferredKey.toUpperCase() : "--"}</p>
                  </div>
                </div>

                <section className="dashboard-preferred-keyboard" aria-label="Preferred online key picker">
                  <div className="dashboard-preferred-keyboard__header">
                    <span>Preferred Buzzer Matrix</span>
                    <span>{preferredKey ? `${preferredKey.toUpperCase()} armed` : "Select one key"}</span>
                  </div>
                  <div className="dashboard-preferred-keyboard__keys" role="group" aria-label="Allowed character keys">
                    {PERSONALIZATION_KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div key={`personalization-key-row-${rowIndex}`} className="dashboard-preferred-keyboard__row">
                        {row.map((key) => (
                          <button
                            key={key}
                            type="button"
                            className={`dashboard-preferred-key ${preferredKey === key ? "dashboard-preferred-key--active" : ""}`}
                            onClick={() => choosePreferredKey(key)}
                            aria-pressed={preferredKey === key}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              </CardContent>
            </Card>

            <Card className="dashboard-panel-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <div className="dashboard-theme-header-row">
                  <div>
                    <CardTitle className="dashboard-card-glow-title dashboard-theme-command-title uppercase tracking-[0.08em]">THEME: COMMAND {activeThemeCommand.name}</CardTitle>
                    <CardDescription>Choose your command deck identity.</CardDescription>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="dashboard-theme-reset-button" onClick={resetThemeShade}>
                    Reset to Default
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content dashboard-theme-picker-card">
                <div className="dashboard-theme-indicators" aria-label="Selected theme indicators">
                  {THEME_COMMANDS.map((command) => {
                    const shadeColor = themeShadeSelections[command.id] || command.color;
                    return (
                      <Tooltip key={`theme-indicator-${command.id}`} className="dashboard-theme-tooltip">
                        <TooltipTrigger>
                          <button
                            type="button"
                            className={`dashboard-theme-indicator ${themeCommand === command.id ? "dashboard-theme-indicator--active" : ""}`}
                            style={{ "--dashboard-theme-option-color": shadeColor } as CSSProperties}
                            onClick={() => chooseThemeCommand(command.id)}
                            aria-label={`Select ${command.name} theme`}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="dashboard-theme-tooltip__content">{command.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <Tabs className="dashboard-theme-tabs">
                  <TabsList className="dashboard-theme-tabs__list" aria-label="Theme command tabs">
                    {THEME_COMMANDS.map((command) => {
                      const shadeColor = themeShadeSelections[command.id] || command.color;
                      return (
                        <TabsTrigger
                          key={`theme-tab-${command.id}`}
                          type="button"
                          active={themeCommand === command.id}
                          className={`dashboard-theme-tab ${hoveredThemeCommand === command.id && themeCommand !== command.id ? "dashboard-theme-tab--preview" : ""}`}
                          style={{ "--dashboard-theme-option-color": shadeColor } as CSSProperties}
                          onClick={() => chooseThemeCommand(command.id)}
                        >
                          {command.name}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {THEME_COMMANDS.map((command) => {
                    const color = themeCommand === command.id ? customThemeColor : command.color;
                    return (
                      <TabsContent key={`theme-panel-${command.id}`} active={themeCommand === command.id}>
                        <div className={`dashboard-theme-option dashboard-theme-option--${command.id} dashboard-theme-option--active`} style={{ "--dashboard-theme-option-color": color } as CSSProperties}>
                          <div>
                            <span>{command.name}</span>
                            <small>{command.protocol}</small>
                          </div>
                          <strong className="dashboard-theme-option__hex">{color}</strong>
                        </div>
                        <HexColorPicker
                          activeOwner={themeCommand}
                          allowedColors={activeThemeShadeColors}
                          ariaLabel={`${command.name} hex color picker`}
                          className="dashboard-theme-color-picker"
                          getColorOwner={getThemeOwnerForColor}
                          onColorHover={(owner) => setHoveredThemeCommand(owner ? normalizeThemeCommand(owner) : null)}
                          onUnavailableColorSelect={chooseThemeFromBlockedColor}
                          replacementColors={THEME_COMMANDS.map((themeCommandOption) => themeCommandOption.color)}
                          value={customThemeColor}
                          onChange={chooseThemeColor}
                        />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
