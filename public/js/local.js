/**
 * local.js — Entry point for local (shared-keyboard) multiplayer mode.
 *
 * Wires the GameEngine + UIRenderer together, and listens for
 * keyboard input to route presses to the correct player.
 */

import { GameEngine, GameState } from "./GameEngine.js";
import { UIRenderer } from "./UIRenderer.js";

if (window.mountAccountMenu) {
  window.mountAccountMenu({ rootId: "account-menu-root" });
}

const engine   = new GameEngine();
const root     = document.getElementById("game-root");
const renderer = new UIRenderer(engine, root);

function isTypingInLobby() {
  const active = document.activeElement;
  if (!active) return false;

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName) || active.isContentEditable;
}

/* ── Keyboard listener ── */
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (engine.state === GameState.LOBBY && !isTypingInLobby()) {
    const confirmed = engine.confirmPlayerByKey(key);
    if (confirmed) {
      e.preventDefault();
      return;
    }
  }

  if (engine.state !== GameState.WAITING && engine.state !== GameState.REACT) return;

  const playerId = engine.findPlayerByKey(key);
  if (playerId) {
    e.preventDefault();
    engine.handleInput(playerId);
  }
});
