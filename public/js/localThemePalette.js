export const THEME_PROTOCOLS = [
  { id: "ares", label: "Ares", fallbackColor: "#ff003c" },
  { id: "vulcan", label: "Vulcan", fallbackColor: "#ff7a00" },
  { id: "apollo", label: "Apollo", fallbackColor: "#ffd400" },
  { id: "gaia", label: "Gaia", fallbackColor: "#24f07a" },
  { id: "tron", label: "Tron", fallbackColor: "#00d4ff" },
  { id: "bacchus", label: "Bacchus", fallbackColor: "#8a2bff" },
  { id: "aphrodite", label: "Aphrodite", fallbackColor: "#ff2ebd" },
  { id: "olympus", label: "Olympus", fallbackColor: "#FFFFFF" },
];

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeThemeCommand(value) {
  return THEME_PROTOCOLS.some((protocol) => protocol.id === value) ? value : "tron";
}

export function getCurrentLocalThemeCommand() {
  return normalizeThemeCommand(
    window.localStorage.getItem("reflexRoyaleThemeCommand") ||
    window.localStorage.getItem("ui-lab-theme")
  );
}

export function getLocalPlayerThemePalette() {
  const accountShades = window.__reflexRoyaleLocalThemeShades || {};

  return THEME_PROTOCOLS.map((protocol) => ({
    ...protocol,
    color: isHexColor(accountShades[protocol.id]) ? accountShades[protocol.id] : protocol.fallbackColor,
  }));
}
