/**
 * local.js — Entry point for local (shared-keyboard) multiplayer mode.
 *
 * Wires the GameEngine + UIRenderer together, and listens for
 * keyboard input to route presses to the correct player.
 */

import { GameEngine, GameState } from "./GameEngine.js";
import { UIRenderer } from "./UIRenderer.js";

if (window.__reflexRoyaleLocalCleanup) {
  window.__reflexRoyaleLocalCleanup();
}

const engine   = new GameEngine();
const root     = document.getElementById("game-root");
const renderer = new UIRenderer(engine, root);
window.__reflexRoyaleLegacyReady = true;
window.dispatchEvent(new Event("reflex-royale-legacy-ready"));

function isTypingInLobby() {
  const active = document.activeElement;
  if (!active) return false;

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName) || active.isContentEditable;
}

/* ── Keyboard listener ── */
const handleKeyDown = (e) => {
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
};

document.addEventListener("keydown", handleKeyDown);

const cleanupLocalGame = () => {
  document.removeEventListener("keydown", handleKeyDown);
  if (window.__reflexRoyaleLocalCleanup === cleanupLocalGame) {
    window.__reflexRoyaleLocalCleanup = undefined;
  }
};

window.__reflexRoyaleLocalCleanup = cleanupLocalGame;
