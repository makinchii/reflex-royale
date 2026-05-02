const KEYBOARD_ROWS = Object.freeze([
  Object.freeze(["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]),
  Object.freeze(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"]),
  Object.freeze(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"]),
  Object.freeze(["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"])
]);

const SHIFTED_KEY_MAP = Object.freeze({
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
  "_": "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  "\"": "'",
  "<": ",",
  ">": ".",
  "?": "/"
});

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
