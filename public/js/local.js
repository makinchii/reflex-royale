/**
 * local.js — Entry point for local (shared-keyboard) multiplayer mode.
 *
 * Wires the GameEngine + UIRenderer together, and listens for
 * keyboard input to route presses to the correct player.
 */

import { GameEngine, GameState } from "./GameEngine.js";
import { UIRenderer } from "./UIRenderer.js";

const engine   = new GameEngine();
const root     = document.getElementById("game-root");
const renderer = new UIRenderer(engine, root);

/* ── Keyboard listener ── */
document.addEventListener("keydown", (e) => {
  // Only process during active gameplay
  if (engine.state !== GameState.WAITING && engine.state !== GameState.REACT) return;

  const key = e.key.toLowerCase();
  const playerId = engine.findPlayerByKey(key);
  if (playerId) {
    e.preventDefault();
    engine.handleInput(playerId);
  }
});
