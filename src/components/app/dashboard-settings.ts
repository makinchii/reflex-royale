import { KEYBOARD_ROWS, SHIFTED_KEY_MAP } from "@/lib/game/keys";
import type { AudioCategory } from "@/lib/audio";
import type { AtmospherePreset, AtmosphereState } from "@/lib/visual-atmosphere";
import type { Intensity } from "@/lib/ui-preferences";
import { THEME_COMMAND_COLORS, type ThemeCommandId } from "@/lib/theme-preferences";

export type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

export type TabId = "play" | "analytics" | "visuals" | "sound" | "personalization";
export type PersonalizationTheme = "tron" | "ares" | "custom";

export type RecentMatch = {
  mode: "local" | "online";
  playedAt: Date | string;
  place: number;
  averageReactionTime: number;
};

export type AudioCategoryFilter = "all" | AudioCategory;
export type VisualPresetId = Exclude<AtmospherePreset, "custom">;

export const PREFERRED_KEY_KEY = "reflexRoyalePreferredKey";
export const THEME_KEY = "ui-lab-theme";
export const INTENSITY_KEY = "ui-lab-intensity";
export const ATMOSPHERE_KEY = "ui-lab-atmosphere";
export const VISUAL_ANIMATIONS_KEY = "reflexRoyaleVisualAnimationsEnabled";
export const VISUAL_PREFERENCES_CHANGED_EVENT = "reflexRoyaleVisualPreferencesChanged";
export const CUSTOM_THEME_COLOR_KEY = "reflexRoyaleCustomThemeColor";
export const THEME_COMMAND_KEY = "reflexRoyaleThemeCommand";
export const COOKIE_MAX_AGE = 31_536_000;

export const VISUAL_PRESETS: Array<{ id: VisualPresetId; label: string; description: string; intensity: Intensity }> = [
  { id: "calm", label: "Calm", description: "Reduced motion with softer background traffic.", intensity: "light" },
  { id: "balanced", label: "Balanced", description: "Default density for command-center readability.", intensity: "medium" },
  { id: "electric", label: "Electric", description: "Maximum grid pressure, particles, and beams.", intensity: "heavy" },
];

export const INTENSITY_OPTIONS: Array<{ value: Intensity; label: string; description: string }> = [
  { value: "none", label: "Minimal", description: "Disable animated grid effects." },
  { value: "light", label: "Light", description: "Low-glow dashboard baseline." },
  { value: "medium", label: "Medium", description: "Balanced neon response." },
  { value: "heavy", label: "Heavy", description: "High-output arcade glow." },
];

export const THEME_COMMANDS: Array<{ id: ThemeCommandId; name: string; color: string; protocol: string; theme: PersonalizationTheme }> = [
  { id: "ares", name: "ARES", color: THEME_COMMAND_COLORS.ares, protocol: "Red combat protocol", theme: "ares" },
  { id: "vulcan", name: "VULCAN", color: THEME_COMMAND_COLORS.vulcan, protocol: "Orange forge protocol", theme: "custom" },
  { id: "apollo", name: "APOLLO", color: THEME_COMMAND_COLORS.apollo, protocol: "Yellow solar protocol", theme: "custom" },
  { id: "gaia", name: "GAIA", color: THEME_COMMAND_COLORS.gaia, protocol: "Green biosphere protocol", theme: "custom" },
  { id: "tron", name: "TRON", color: THEME_COMMAND_COLORS.tron, protocol: "Blue grid protocol", theme: "tron" },
  { id: "bacchus", name: "BACCHUS", color: THEME_COMMAND_COLORS.bacchus, protocol: "Purple pulse protocol", theme: "custom" },
  { id: "aphrodite", name: "APHRODITE", color: THEME_COMMAND_COLORS.aphrodite, protocol: "Pink signal protocol", theme: "custom" },
  { id: "olympus", name: "OLYMPUS", color: THEME_COMMAND_COLORS.olympus, protocol: "White ascendant protocol", theme: "custom" },
];

export const PERSONALIZATION_KEYBOARD_ROWS = KEYBOARD_ROWS;
const PERSONALIZATION_ALLOWED_KEYS = new Set(PERSONALIZATION_KEYBOARD_ROWS.flat());
const PERSONALIZATION_SHIFTED_KEYS: Record<string, string> = SHIFTED_KEY_MAP;

export function normalizePersonalizationKey(value: string) {
  if (value.length !== 1) return "";
  const lower = value.toLowerCase();
  const normalized = PERSONALIZATION_SHIFTED_KEYS[lower] || lower;
  return PERSONALIZATION_ALLOWED_KEYS.has(normalized) ? normalized : "";
}

export function getThemeCommand(id: ThemeCommandId) {
  return THEME_COMMANDS.find((command) => command.id === id) ?? THEME_COMMANDS.find((command) => command.id === "tron")!;
}

export function normalizeCustomThemeColor(value: string | null) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : getThemeCommand("tron").color;
}

export function resolveTheme(command: { theme: PersonalizationTheme; color: string }, color: string): PersonalizationTheme {
  return color.toLowerCase() === command.color.toLowerCase() ? command.theme : "custom";
}

export function applyCustomThemeColor(color: string) {
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

export function clearCustomThemeColor() {
  [document.documentElement, document.body].forEach((node) => {
    ["--primary", "--accent", "--ring", "--border", "--input", "--glow", "--glow-muted", "--sidebar-primary", "--sidebar-border", "--sidebar-ring"].forEach((property) => {
      node.style.removeProperty(property);
    });
  });
}

export function applyPersonalizationTheme(theme: PersonalizationTheme, customColor = getThemeCommand("tron").color, commandId: ThemeCommandId = "tron") {
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

export function saveThemePreferenceWithShades(command: { id: ThemeCommandId; color: string }, shades: Record<ThemeCommandId, string>) {
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

export function rankColor(rank: number) {
  if (rank === 1) return "#D4AF37";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return undefined;
}

export function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function formatAudioTrackDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function valueToPercent(value: number, min: number, max: number) {
  return clampPercent(((value - min) / (max - min)) * 100);
}

export function percentToValue(percent: number, min: number, max: number) {
  return min + (clampPercent(percent) / 100) * (max - min);
}

declare global {
  interface Window {
    __reflexRoyaleSetFavicon?: () => void;
  }
}
