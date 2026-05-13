import { THEME_COMMAND_COLORS, type ThemeCommandId } from "@/lib/theme-preferences";

export type ThemeProtocol = {
  fallbackColor: string;
  id: ThemeCommandId;
  label: string;
};

export type ResolvedThemeProtocol = ThemeProtocol & {
  color: string;
};

export const CHROMA_THEME_PROTOCOLS: readonly ThemeProtocol[] = [
  { id: "ares", label: "Ares", fallbackColor: THEME_COMMAND_COLORS.ares },
  { id: "vulcan", label: "Vulcan", fallbackColor: THEME_COMMAND_COLORS.vulcan },
  { id: "apollo", label: "Apollo", fallbackColor: THEME_COMMAND_COLORS.apollo },
  { id: "gaia", label: "Gaia", fallbackColor: THEME_COMMAND_COLORS.gaia },
  { id: "tron", label: "Tron", fallbackColor: THEME_COMMAND_COLORS.tron },
  { id: "bacchus", label: "Bacchus", fallbackColor: THEME_COMMAND_COLORS.bacchus },
  { id: "aphrodite", label: "Aphrodite", fallbackColor: THEME_COMMAND_COLORS.aphrodite },
  { id: "olympus", label: "Olympus", fallbackColor: THEME_COMMAND_COLORS.olympus },
] as const;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeChromaThemeCommand(value: unknown) {
  return CHROMA_THEME_PROTOCOLS.some((protocol) => protocol.id === value) ? String(value) : "tron";
}

export function getThemePalette(localPlayerThemeShades: Record<string, string> | null | undefined): ResolvedThemeProtocol[] {
  const accountShades = localPlayerThemeShades || {};
  return CHROMA_THEME_PROTOCOLS.map((protocol) => ({
    ...protocol,
    color: isHexColor(accountShades[protocol.id]) ? accountShades[protocol.id] : protocol.fallbackColor,
  }));
}
