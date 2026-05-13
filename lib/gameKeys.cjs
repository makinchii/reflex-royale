const { keyboardRows, shiftedKeyMap } = require("./gameKeysData.json");

const KEYBOARD_ROWS = Object.freeze(keyboardRows.map((row) => Object.freeze([...row])));
const SHIFTED_KEY_MAP = Object.freeze({ ...shiftedKeyMap });

const ALLOWED_GAME_KEYS = new Set(KEYBOARD_ROWS.flat());

function normalizeGameKey(value) {
  if (typeof value !== "string") return "";
  if (value.length !== 1) return "";

  const lower = value.toLowerCase();
  const normalized = SHIFTED_KEY_MAP[lower] || lower;
  return ALLOWED_GAME_KEYS.has(normalized) ? normalized : "";
}

function isAllowedGameKey(value) {
  return normalizeGameKey(value) !== "";
}

module.exports = {
  ALLOWED_GAME_KEYS,
  KEYBOARD_ROWS,
  SHIFTED_KEY_MAP,
  isAllowedGameKey,
  normalizeGameKey
};
