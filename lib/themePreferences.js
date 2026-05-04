const THEME_COMMAND_COLORS = {
  ares: "#ff003c",
  vulcan: "#ff7a00",
  apollo: "#ffd400",
  aphrodite: "#ff2ebd",
  bacchus: "#8a2bff",
  tron: "#00d4ff",
  gaia: "#24f07a",
  olympus: "#FFFFFF",
};

const THEME_SHADE_COLORS = {
  ares: ["#ff003c", "#FF5050", "#FF0000", "#CC0000", "#990000", "#800000", "#993333", "#FF6666", "#CC0000", "#990033", "#FF9999"],
  vulcan: ["#ff7a00", "#FF9900", "#FF9933", "#FF6600", "#FF3300", "#CC6600", "#CC9900", "#996600", "#996633", "#CC3300", "#993300", "#663300", "#FFCC99", "#FF9966"],
  apollo: ["#ffd400", "#FFFF00", "#FFCC00", "#CCCC00", "#FFFF66", "#FFFF99", "#FFFFCC", "#CCFF33", "#CCFF66", "#CCFF99", "#999966", "#666633", "#333300", "#FFCC66"],
  aphrodite: ["#ff2ebd", "#FFCCFF", "#FF99FF", "#FF66FF", "#FF00FF", "#CC00CC", "#FF99CC", "#FF66CC", "#FF33CC", "#CC0099", "#FF3399", "#CC3399", "#CC6699", "#993366", "#FF0066", "#FFCCCC", "#FF6699", "#CC0066", "#660033"],
  bacchus: ["#8a2bff", "#6600FF", "#6600CC", "#9966FF", "#9933FF", "#9900FF", "#9900CC", "#660066", "#993399", "#990099", "#CC99FF", "#CC66FF", "#CC33FF", "#CC00FF", "#CCCCFF", "#9999FF", "#6666FF"],
  tron: ["#00d4ff", "#003366", "#336699", "#3366CC", "#003399", "#000099", "#0000CC", "#000066", "#006666", "#006699", "#0099CC", "#0066CC", "#0033CC", "#0000FF", "#3333FF", "#333399", "#669999", "#009999", "#33CCCC", "#00CCFF", "#0099FF", "#0066FF", "#3366FF", "#3333CC", "#666699", "#00CC99", "#00FFCC", "#00FFFF", "#33CCFF", "#3399FF", "#6699FF", "#66FFFF", "#66CCFF", "#99CCFF", "#CCFFFF"],
  gaia: ["#24f07a", "#339966", "#339933", "#00CC66", "#00FF99", "#006600", "#00CC00", "#00FF00", "#003300", "#009933", "#33CC33", "#66FF66", "#99FF99", "#CCFFCC", "#336600", "#009900", "#66FF33", "#99FF66", "#669900", "#99FF33", "#99CC00", "#66FFCC", "#99FFCC", "#66FF99"],
  olympus: ["#FFFFFF"],
};

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
