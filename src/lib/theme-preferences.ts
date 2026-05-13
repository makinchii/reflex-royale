import themePreferencesData from "../../lib/themePreferencesData.json";

export type ThemeCommandId = keyof typeof themePreferencesData.commandColors;

export const THEME_COMMAND_COLORS = Object.freeze({ ...themePreferencesData.commandColors }) as Record<ThemeCommandId, string>;
export const THEME_SHADE_COLORS = Object.freeze(Object.fromEntries(Object.entries(themePreferencesData.shadeColors).map(([command, colors]) => [command, Object.freeze([...colors])]))) as Record<ThemeCommandId, string[]>;

export const THEME_COLOR_OWNERS = Object.entries(THEME_SHADE_COLORS).reduce<Record<string, ThemeCommandId>>((owners, [command, colors]) => {
  colors.forEach((color) => {
    owners[color.toLowerCase()] = command as ThemeCommandId;
  });
  return owners;
}, {});

export function normalizeThemeCommand(value: string | null | undefined): ThemeCommandId {
  return value && value in THEME_COMMAND_COLORS ? value as ThemeCommandId : "tron";
}

export function getThemeOwnerForColor(color: string): ThemeCommandId | null {
  return THEME_COLOR_OWNERS[color.toLowerCase()] ?? null;
}

export function isAllowedThemeColor(command: ThemeCommandId, color: string) {
  return getThemeOwnerForColor(color) === command;
}

export function defaultThemeShades(): Record<ThemeCommandId, string> {
  return { ...THEME_COMMAND_COLORS };
}

export function normalizeThemeShades(input?: Partial<Record<ThemeCommandId, string>> | null) {
  const shades = defaultThemeShades();
  Object.keys(THEME_COMMAND_COLORS).forEach((command) => {
    const themeCommand = command as ThemeCommandId;
    const value = input?.[themeCommand];
    if (value && isAllowedThemeColor(themeCommand, value)) shades[themeCommand] = value;
  });
  return shades;
}
