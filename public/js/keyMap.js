export const KEYBOARD_ROWS = Object.freeze([
  Object.freeze(["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]),
  Object.freeze(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"]),
  Object.freeze(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"]),
  Object.freeze(["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"])
]);

export const SHIFTED_KEY_MAP = Object.freeze({
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
const highlightTimeouts = new WeakMap();

export function normalizeGameKey(value) {
  if (typeof value !== "string") return "";
  if (value.length !== 1) return "";

  const lower = value.toLowerCase();
  const normalized = SHIFTED_KEY_MAP[lower] || lower;
  return ALLOWED_GAME_KEYS.has(normalized) ? normalized : "";
}

export function isAllowedGameKey(value) {
  return normalizeGameKey(value) !== "";
}

export function renderHolographicKeyboard(players = [], { currentPlayerId = null, draggable = false, title = "Buzzer Matrix" } = {}) {
  const byKey = new Map();

  for (const player of players) {
    const key = normalizeGameKey(player.key || player.keyBinding || "");
    if (!key) continue;

    byKey.set(key, {
      color: player.color || "#888888",
      id: player.id || "",
      name: player.name || "Player",
      draggable: Boolean(draggable && !player.ready && !player.isReady && (!currentPlayerId || player.id === currentPlayerId)),
      ready: Boolean(player.ready || player.isReady)
    });
  }

  return `
    <section class="holo-keyboard-panel" aria-label="${escapeHtml(title)}">
      <div class="holo-keyboard-panel__header">
        <span>${escapeHtml(title)}</span>
        <span>click a key to assign</span>
      </div>
      <div class="holo-keyboard" role="group" aria-label="Allowed character keys">
        ${KEYBOARD_ROWS.map((row) => `
          <div class="holo-keyboard-row">
            ${row.map((key) => renderKey(key, byKey.get(key))).join("")}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function pulseKeyboardKey(root, value = "") {
  const scope = root || document;
  const key = normalizeGameKey(String(value));
  if (!key) return;

  scope.querySelectorAll(`.holo-key[data-key="${cssEscape(key)}"]`).forEach((button) => {
    const existingTimeout = highlightTimeouts.get(button);
    if (existingTimeout) window.clearTimeout(existingTimeout);

    button.classList.add("holo-key--input-active");
    const timeout = window.setTimeout(() => {
      button.classList.remove("holo-key--input-active");
      highlightTimeouts.delete(button);
    }, 420);
    highlightTimeouts.set(button, timeout);
  });
}

export function syncKeyboardInputHighlights(root, value = "") {
  pulseKeyboardKey(root, String(value).slice(-1));
}

function renderKey(key, owner) {
  const className = owner ? `holo-key holo-key--bound${owner.ready ? " holo-key--ready" : ""}` : "holo-key";
  const style = owner ? ` style="--key-color:${escapeAttr(owner.color)}"` : "";
  const dragAttrs = owner?.draggable ? ` draggable="true" data-draggable="true" data-player-id="${escapeAttr(owner.id)}"` : "";
  const label = key;
  const ownerLabel = owner ? ` aria-label="${escapeAttr(key)} assigned to ${escapeAttr(owner.name)}${owner.ready ? ", ready" : ""}"` : ` aria-label="Assign ${escapeAttr(key)}"`;

  return `<button type="button" class="${className}" data-key="${escapeAttr(key)}" data-occupied="${owner ? "true" : "false"}"${style}${ownerLabel}${dragAttrs}>${escapeHtml(label)}</button>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/(["\\])/g, "\\$1");
}
