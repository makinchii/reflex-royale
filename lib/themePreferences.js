const { commandColors, shadeColors } = require("./themePreferencesData.json");

const THEME_COMMAND_COLORS = Object.freeze({ ...commandColors });
const THEME_SHADE_COLORS = Object.freeze(Object.fromEntries(Object.entries(shadeColors).map(([command, colors]) => [command, Object.freeze([...colors])])));

const THEME_COLOR_OWNERS = Object.entries(THEME_SHADE_COLORS).reduce((owners, [command, colors]) => {
  colors.forEach((color) => {
    owners[color.toLowerCase()] = command;
  });
  return owners;
}, {});

function normalizeThemeCommand(value) {
  return Object.prototype.hasOwnProperty.call(THEME_COMMAND_COLORS, value) ? value : "tron";
}

function getThemeOwnerForColor(color) {
  return typeof color === "string" ? THEME_COLOR_OWNERS[color.toLowerCase()] || null : null;
}

function isAllowedThemeColor(command, color) {
  return getThemeOwnerForColor(color) === command;
}

function defaultThemeShades() {
  return { ...THEME_COMMAND_COLORS };
}

function normalizeThemeShades(input = {}) {
  const source = input instanceof Map ? Object.fromEntries(input.entries()) : input;
  const shades = defaultThemeShades();
  Object.keys(THEME_COMMAND_COLORS).forEach((command) => {
    const value = source?.[command];
    if (isAllowedThemeColor(command, value)) shades[command] = value;
  });
  return shades;
}

module.exports = {
  THEME_COLOR_OWNERS,
  THEME_COMMAND_COLORS,
  THEME_SHADE_COLORS,
  defaultThemeShades,
  getThemeOwnerForColor,
  isAllowedThemeColor,
  normalizeThemeCommand,
  normalizeThemeShades,
};
