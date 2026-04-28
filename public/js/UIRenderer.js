/**
 * UIRenderer.js — DOM rendering layer for Reflex Royale (local mode).
 *
 * Subscribes to GameEngine events and paints the UI.
 * Keeps all DOM manipulation in one place so it's easy to reskin later.
 */

import { GameState } from "./GameEngine.js";

const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];

export class UIRenderer {
  /**
   * @param {import('./GameEngine.js').GameEngine} engine
   * @param {HTMLElement} root – the element to render into
   */
  constructor(engine, root) {
    this.engine = engine;
    this.root   = root;

    this._bindEngineEvents();
    this.renderLobby();
  }

  /* ───────── Engine event wiring ───────── */

  _bindEngineEvents() {
    const e = this.engine;

    e.on("playerAdded",   () => this._refreshLobbyPlayers());
    e.on("playerRemoved", () => this._refreshLobbyPlayers());
    e.on("playerReady",   () => this._refreshLobbyPlayers());
    e.on("playerUnready", () => this._refreshLobbyPlayers());
    e.on("allPlayersReady", () => this._refreshLobbyPlayers());
    e.on("gameStarted",   () => this._onGameStarted());
    e.on("countdown",     d  => this._onCountdown(d));
    e.on("waiting",       () => this._onWaiting());
    e.on("react",         () => this._onReact());
    e.on("falseStart",    d  => this._onFalseStart(d));
    e.on("playerReacted", d  => this._onPlayerReacted(d));
    e.on("roundEnd",      d  => this._onRoundEnd(d));
    e.on("gameOver",      d  => this._onGameOver(d));
    e.on("resetToLobby",  () => this.renderLobby());
    e.on("fullReset",     () => this.renderLobby());
  }

  /* ───────── Lobby screen ───────── */

  renderLobby() {
    this.root.innerHTML = `
      <div class="lobby">
        <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
        <p class="subtitle">Local Multiplayer — 2-4 Players</p>

        <div class="lobby-form">
          <div class="input-row">
            <input id="playerName" type="text" placeholder="Player name" maxlength="12" autocomplete="off" />
            <input id="playerKey"  type="text" placeholder="Key" maxlength="1" autocomplete="off" />
            <button id="addPlayerBtn" class="btn btn-primary">Add Player</button>
          </div>
          <p class="hint">Add players, then press each key once to bind and again to confirm ready.</p>
          <p id="lobbyStatus" class="hint"></p>
        </div>

        <div id="playerSlots" class="player-slots"></div>

        <div class="lobby-settings">
          <label>Rounds: <input id="roundCount" type="number" min="1" max="20" value="5" /></label>
        </div>

        <button id="startGameBtn" class="btn btn-big btn-go" disabled>Start Game</button>
      </div>
    `;

    this._refreshLobbyPlayers();

    // Wire up DOM events
    const addBtn   = this.root.querySelector("#addPlayerBtn");
    const startBtn = this.root.querySelector("#startGameBtn");
    const nameInp  = this.root.querySelector("#playerName");
    const keyInp   = this.root.querySelector("#playerKey");
    const roundInp = this.root.querySelector("#roundCount");
    const statusEl = this.root.querySelector("#lobbyStatus");

    addBtn.addEventListener("click", () => this._addPlayerFromForm());

    nameInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._addPlayerFromForm();
    });
    keyInp.addEventListener("keydown", (e) => {
      e.preventDefault();
      keyInp.value = e.key.length === 1 ? e.key.toUpperCase() : "";
    });

    keyInp.addEventListener("input", () => {
      keyInp.value = keyInp.value.slice(0, 1).toUpperCase();
    });

    startBtn.addEventListener("click", () => {
      const rounds = parseInt(roundInp.value, 10) || 5;
      this.engine.totalRounds = rounds;
      this.engine.startGame();
    });
  }

  _addPlayerFromForm() {
    const nameInp = this.root.querySelector("#playerName");
    const keyInp  = this.root.querySelector("#playerKey");
    const statusEl = this.root.querySelector("#lobbyStatus");
    const name = nameInp.value.trim();
    const key  = keyInp.value.trim().toLowerCase();

    if (!name || !key) {
      if (statusEl) statusEl.textContent = "Enter both a player name and a unique key.";
      return;
    }

    const id    = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const color = PLAYER_COLORS[this.engine.players.size] || "#888";

    const success = this.engine.addPlayer(id, name, key, color);
    if (success) {
      nameInp.value = "";
      keyInp.value  = "";
      nameInp.focus();
      if (statusEl) statusEl.textContent = "";
    } else if (statusEl) {
      statusEl.textContent = "That key is already in use, or the lobby is full.";
    }
  }

  _refreshLobbyPlayers() {
    const container = this.root.querySelector("#playerSlots");
    if (!container) return;

    const players = this.engine.getPlayers();
    container.innerHTML = players.map((p, i) => `
      <div class="player-slot" style="border-color:${p.color}">
        <span class="player-slot-name" style="color:${p.color}">${this._esc(p.name)}</span>
        <kbd>${p.key.toUpperCase()}</kbd>
        <span class="ready-state">${p.ready ? "Ready" : "Confirm key"}</span>
        <button class="btn-remove" data-id="${p.id}">&times;</button>
      </div>
    `).join("");

    // Remove buttons
    container.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        this.engine.removePlayer(btn.dataset.id);
      });
    });

    // Enable/disable start button
    const startBtn = this.root.querySelector("#startGameBtn");
    if (startBtn) startBtn.disabled = players.length < 2 || !players.every(p => p.ready);
  }

  /* ───────── In-game screens ───────── */

  _onGameStarted() {
    // Build the split-screen arena
    const players = this.engine.getPlayers();
    const gridClass = `grid-${players.length}`;

    this.root.innerHTML = `
      <div class="arena ${gridClass}">
        ${players.map(p => `
          <div class="player-panel" id="panel-${p.id}" style="--player-color:${p.color}">
            <div class="panel-header">
              <span class="panel-name">${this._esc(p.name)}</span>
              <kbd class="panel-key">${p.key.toUpperCase()}</kbd>
              <span class="panel-score">0 pts</span>
            </div>
            <div class="panel-light">
              <div class="light-circle off"></div>
            </div>
            <div class="panel-feedback"></div>
          </div>
        `).join("")}
      </div>
      <div class="center-overlay" id="centerOverlay"></div>
    `;
  }

  _onCountdown({ remaining }) {
    const overlay = this.root.querySelector("#centerOverlay");
    if (overlay) {
      overlay.className = "center-overlay visible";
      overlay.innerHTML = `<span class="countdown-num">${remaining}</span>`;
    }

    // Reset panel lights
    this.root.querySelectorAll(".light-circle").forEach(el => {
      el.className = "light-circle off";
    });
    this.root.querySelectorAll(".panel-feedback").forEach(el => {
      el.textContent = "";
    });
  }

  _onWaiting() {
    const overlay = this.root.querySelector("#centerOverlay");
    if (overlay) {
      overlay.className = "center-overlay visible";
      overlay.innerHTML = `<span class="wait-text">Wait for it…</span>`;
    }

    // Red light
    this.root.querySelectorAll(".light-circle").forEach(el => {
      el.className = "light-circle red";
    });
  }

  _onReact() {
    const overlay = this.root.querySelector("#centerOverlay");
    if (overlay) {
      overlay.className = "center-overlay visible";
      overlay.innerHTML = `<span class="go-text">GO!</span>`;
    }

    // Green light
    this.root.querySelectorAll(".light-circle").forEach(el => {
      el.className = "light-circle green";
    });
  }

  _onFalseStart({ id, name }) {
    const panel = this.root.querySelector(`#panel-${CSS.escape(id)}`);
    if (panel) {
      panel.querySelector(".light-circle").className = "light-circle red flash";
      panel.querySelector(".panel-feedback").innerHTML = `<span class="false-start">Too early!</span>`;
    }
  }

  _onPlayerReacted({ id, name, time }) {
    const panel = this.root.querySelector(`#panel-${CSS.escape(id)}`);
    if (panel) {
      panel.querySelector(".panel-feedback").innerHTML = `<span class="reaction-time">${time} ms</span>`;
    }
  }

  _onRoundEnd({ roundNum, results }) {
    // Update scores on panels
    for (const p of this.engine.getPlayers()) {
      const panel = this.root.querySelector(`#panel-${CSS.escape(p.id)}`);
      if (panel) {
        panel.querySelector(".panel-score").textContent = `${p.totalScore} pts`;
      }
    }

    // Show round results overlay
    const overlay = this.root.querySelector("#centerOverlay");
    if (overlay) {
      const winner = results[0];
      const isLast = roundNum >= this.engine.totalRounds || this.engine.getPlayers().some(p => p.totalScore >= this.engine.targetScore);
      overlay.className = "center-overlay visible results-overlay";
      overlay.innerHTML = `
        <div class="round-results">
          <h2>Round ${roundNum} Results</h2>
          <ol class="results-list">
            ${results.map((r, i) => `
              <li class="${i === 0 && r.time !== Infinity ? 'winner' : ''}">
                <span class="result-name">${this._esc(r.name)}</span>
                <span class="result-time">${
                  r.falseStart ? "False start!" :
                  r.missed ? "Missed!" :
                  r.time + " ms"
                }</span>
                <span class="result-points">${r.points ? "+" + r.points : "—"}</span>
              </li>
            `).join("")}
          </ol>
          <button id="nextRoundBtn" class="btn btn-primary btn-big">
            ${isLast ? "See Final Results" : "Next Round"}
          </button>
        </div>
      `;

      overlay.querySelector("#nextRoundBtn").addEventListener("click", () => {
        this.engine.nextRound();
      });
    }
  }

  _onGameOver({ standings, roundHistory }) {
    this.root.innerHTML = `
      <div class="game-over">
        <h1 class="winner-banner">
          🏆 ${this._esc(standings[0].name)} Wins! 🏆
        </h1>
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th><th>Player</th><th>Score</th><th>Wins</th>
              <th>Best</th><th>Avg</th><th>False Starts</th>
            </tr>
          </thead>
          <tbody>
            ${standings.map((s, i) => `
              <tr style="color:${s.color}" class="${i === 0 ? 'first-place' : ''}">
                <td>${i + 1}</td>
                <td>${this._esc(s.name)}</td>
                <td>${s.totalScore}</td>
                <td>${s.wins}</td>
                <td>${s.bestTime !== null ? s.bestTime + " ms" : "—"}</td>
                <td>${s.avgTime !== null ? s.avgTime + " ms" : "—"}</td>
                <td>${s.falseStarts}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <h3>Round-by-Round</h3>
        <div class="round-history">
          ${roundHistory.map(r => `
            <div class="history-round">
              <strong>Round ${r.roundNum}</strong>
              <ul>
                ${r.results.map(res => `
                  <li>${this._esc(res.name)}: ${
                    res.falseStart ? "False start" :
                    res.missed ? "Missed" :
                    res.time + " ms"
                  } ${res.points ? "(+" + res.points + ")" : ""}</li>
                `).join("")}
              </ul>
            </div>
          `).join("")}
        </div>

        <div class="game-over-actions">
          <button id="playAgainBtn" class="btn btn-primary btn-big">Play Again</button>
          <button id="newPlayersBtn" class="btn btn-secondary">New Players</button>
        </div>
      </div>
    `;

    this.root.querySelector("#playAgainBtn").addEventListener("click", () => {
      this.engine.resetToLobby();
      this.renderLobby();
    });

    this.root.querySelector("#newPlayersBtn").addEventListener("click", () => {
      this.engine.fullReset();
    });
  }

  /* ───────── Utility ───────── */

  _esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
