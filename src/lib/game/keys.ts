import gameKeysData from "../../../lib/gameKeysData.json";

export const KEYBOARD_ROWS = Object.freeze(gameKeysData.keyboardRows.map((row) => Object.freeze([...row])));
export const SHIFTED_KEY_MAP = Object.freeze({ ...gameKeysData.shiftedKeyMap });

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
