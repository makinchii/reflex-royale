export const KEYBOARD_ROWS = Object.freeze([
  Object.freeze(["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]),
  Object.freeze(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"]),
  Object.freeze(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"]),
  Object.freeze(["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]),
] as const);

export const SHIFTED_KEY_MAP = Object.freeze({
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
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
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
} as const);

export type GameKey = (typeof KEYBOARD_ROWS)[number][number];

export const ALLOWED_GAME_KEYS = new Set<GameKey>(KEYBOARD_ROWS.flat());

export function normalizeGameKey(value: unknown): GameKey | "" {
  if (typeof value !== "string") return "";
  if (value.length !== 1) return "";

  const lower = value.toLowerCase();
  const normalized = SHIFTED_KEY_MAP[lower as keyof typeof SHIFTED_KEY_MAP] || lower;
  return ALLOWED_GAME_KEYS.has(normalized as GameKey) ? (normalized as GameKey) : "";
}

export function isAllowedGameKey(value: unknown): boolean {
  return normalizeGameKey(value) !== "";
}
