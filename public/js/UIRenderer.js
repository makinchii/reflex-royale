/**
 * UIRenderer.js — DOM rendering layer for Reflex Royale (local mode).
 *
 * Subscribes to GameEngine events and paints the UI.
 * Keeps all DOM manipulation in one place so it's easy to reskin later.
 */

import { GameState } from "./GameEngine.js";
import { normalizeGameKey, pulseKeyboardKey, renderHolographicKeyboard, syncKeyboardInputHighlights } from "./keyMap.js";
import { getCurrentLocalThemeCommand, getLocalPlayerThemePalette } from "./localThemePalette.js";

const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";

function announceMatchState(inProgress) {
  window.dispatchEvent(new CustomEvent(AUDIO_MATCH_STATE_EVENT, { detail: { inProgress } }));
}

export class UIRenderer {
  /**
   * @param {import('./GameEngine.js').GameEngine} engine
   * @param {HTMLElement} root – the element to render into
   */
  constructor(engine, root) {
    this.engine = engine;
    this.root   = root;
    this.matchStartedAt = 0;
    this.matchRecorded = false;
    this.themePalette = getLocalPlayerThemePalette();
    this.selectedThemeCommand = getCurrentLocalThemeCommand();

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
    e.on("playerKeyMoved", () => this._refreshLobbyPlayers());
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
    announceMatchState(false);
    this.root.innerHTML = `
      <div class="lobby">
        <div class="lobby-layout-top">
          <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
          <p class="subtitle">Local Multiplayer — 2-4 Players</p>

          <div class="lobby-form">
            <div class="input-row input-row--local-player">
              <input id="playerName" type="text" placeholder="Player name" maxlength="12" autocomplete="off" />
              <input id="playerKey"  type="text" placeholder="Key" maxlength="1" autocomplete="off" />
              <button id="addPlayerBtn" class="btn btn-primary">Add Player</button>
            </div>
            <div class="chroma-sigil-field">
              <button id="themePickerButton" class="btn btn-secondary chroma-sigil-button" type="button" aria-expanded="false" aria-haspopup="dialog" aria-controls="themePickerPanel">
                <span class="chroma-sigil-summary__label">Chroma Sigil:</span>
                <span id="themePickerButtonLabel" class="chroma-sigil-summary__name"></span>
              </button>
              <div id="themePickerPanel" class="chroma-sigil-panel" role="dialog" aria-label="Choose Chroma Sigil" hidden>
                <div id="themePickerTabs" class="chroma-sigil-tabs" role="tablist" aria-label="Player color protocol"></div>
              </div>
            </div>
            <p class="hint">Click a holographic key or press a character key, claim a Chroma Sigil, then add the player. Press assigned keys to toggle ready.</p>
            <p id="lobbyStatus" class="hint"></p>
          </div>

          <div class="lobby-settings">
            <div data-slot="tron-slider" class="round-slider" aria-label="Rounds slider">
              <div class="round-slider__header">
                <span class="round-control">Rounds</span>
                <span id="roundCountValue" class="round-slider__value">5</span>
              </div>
              <div class="round-slider__track-wrap">
                <div data-slot="slider-track" class="round-slider__track"></div>
                <div data-slot="slider-range" class="round-slider__range" style="width: 0%"></div>
                <div data-slot="slider-thumb" class="round-slider__thumb" style="left: 0%"></div>
                <input id="roundCount" class="round-slider__input" type="range" min="1" max="20" step="1" value="5" />
              </div>
            </div>
          </div>
        </div>

        <div id="playerSlots" class="player-slots player-slots--docked" aria-label="Player slots"></div>

        <div id="holoKeyboardMount">${renderHolographicKeyboard([], { title: "LOCAL KEYBOARD MATRIX" })}</div>

        <div class="lobby-layout-bottom">
          <button id="startGameBtn" class="btn btn-big btn-go" disabled>Start Game</button>
        </div>
      </div>
    `;

    this._refreshLobbyPlayers();

    // Wire up DOM events
    const addBtn   = this.root.querySelector("#addPlayerBtn");
    const startBtn = this.root.querySelector("#startGameBtn");
    const nameInp  = this.root.querySelector("#playerName");
    const keyInp   = this.root.querySelector("#playerKey");
    const roundInp = this.root.querySelector("#roundCount");
    const roundValue = this.root.querySelector("#roundCountValue");
    const themeBtn = this.root.querySelector("#themePickerButton");
    const themePanel = this.root.querySelector("#themePickerPanel");

    const updateRoundSlider = () => {
      const min = Number(roundInp.min || 1);
      const max = Number(roundInp.max || 20);
      const current = Number(roundInp.value || 5);
      const percent = ((current - min) / (max - min)) * 100;

      if (roundValue) roundValue.textContent = String(current);
      const range = this.root.querySelector('[data-slot="slider-range"]');
      const thumb = this.root.querySelector('[data-slot="slider-thumb"]');
      if (range) range.style.width = `${percent}%`;
      if (thumb) thumb.style.left = `${percent}%`;
    };

    addBtn.addEventListener("click", () => this._addPlayerFromForm());

    themeBtn.addEventListener("click", () => {
      const isOpen = !themePanel.hidden;
      themePanel.hidden = isOpen;
      themeBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    nameInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._addPlayerFromForm();
    });
    keyInp.addEventListener("keydown", (e) => {
      e.preventDefault();
      keyInp.value = normalizeGameKey(e.key).toUpperCase();
    });

    keyInp.addEventListener("input", () => {
      keyInp.value = normalizeGameKey(keyInp.value).toUpperCase();
    });

    this._wireInputKeyboardHighlights([nameInp, keyInp]);

    startBtn.addEventListener("click", () => {
      const rounds = parseInt(roundInp.value, 10) || 5;
      this.engine.totalRounds = rounds;
      this.engine.startGame();
    });

    roundInp.addEventListener("input", updateRoundSlider);
    updateRoundSlider();
    this._refreshThemePicker();
    this._wireKeyboardKeys();
  }

  _getClaimedThemeCommands() {
    return new Set(this.engine.getPlayers().map((player) => player.themeCommand).filter(Boolean));
  }

  _getAvailableThemeCommand() {
    const claimed = this._getClaimedThemeCommands();
    return this.themePalette.find((protocol) => !claimed.has(protocol.id))?.id || null;
  }

  _getSelectedThemeProtocol() {
    return this.themePalette.find((protocol) => protocol.id === this.selectedThemeCommand) || this.themePalette[0] || null;
  }

  _syncSelectedThemeAfterRosterChange() {
    const claimed = this._getClaimedThemeCommands();
    if (claimed.has(this.selectedThemeCommand)) {
      this.selectedThemeCommand = this._getAvailableThemeCommand() || this.selectedThemeCommand;
    }
  }

  _refreshThemePicker() {
    const tabs = this.root.querySelector("#themePickerTabs");
    const label = this.root.querySelector("#themePickerButtonLabel");
    const button = this.root.querySelector("#themePickerButton");
    if (!tabs || !label || !button) return;

    this._syncSelectedThemeAfterRosterChange();
    const claimed = this._getClaimedThemeCommands();
    const selected = this._getSelectedThemeProtocol();
    const selectedLabel = selected?.label || "All Claimed";
    label.textContent = selectedLabel;
    button.style.setProperty("--sigil-color", selected?.color || "var(--primary, #68e8ff)");
    button.disabled = !selected;

    tabs.innerHTML = this.themePalette.map((protocol) => {
      const claimedByPlayer = claimed.has(protocol.id);
      const active = protocol.id === this.selectedThemeCommand && !claimedByPlayer;
      return `
        <button
          class="chroma-sigil-tab ${active ? "is-active" : ""} ${claimedByPlayer ? "is-claimed" : ""}"
          type="button"
          role="tab"
          aria-selected="${active}"
          data-theme-command="${protocol.id}"
          style="--sigil-color:${protocol.color}"
          ${claimedByPlayer ? "disabled" : ""}
        >
          <span class="chroma-sigil-tab__swatch" aria-hidden="true"></span>
          <span>${protocol.label}</span>
        </button>
      `;
    }).join("");

    tabs.querySelectorAll(".chroma-sigil-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const command = tab.dataset.themeCommand;
        if (!command || claimed.has(command)) return;
        this.selectedThemeCommand = command;
        this._refreshThemePicker();
      });
    });
  }

  _wireInputKeyboardHighlights(inputs) {
    inputs.filter(Boolean).forEach((input) => {
      input.addEventListener("keydown", (event) => pulseKeyboardKey(this.root, event.key));
      input.addEventListener("input", () => syncKeyboardInputHighlights(this.root, input.value));
    });
  }

  _addPlayerFromForm() {
    const nameInp = this.root.querySelector("#playerName");
    const keyInp  = this.root.querySelector("#playerKey");
    const statusEl = this.root.querySelector("#lobbyStatus");
    const name = nameInp.value.trim();
    const key  = normalizeGameKey(keyInp.value.trim());

    if (!name || !key) {
      if (statusEl) statusEl.textContent = "Enter both a player name and a unique key.";
      return;
    }

    const id    = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const themeProtocol = this._getSelectedThemeProtocol();
    if (!themeProtocol) {
      if (statusEl) statusEl.textContent = "All Chroma Sigils are already claimed.";
      return;
    }

    const success = this.engine.addPlayer(id, name, key, themeProtocol.color, themeProtocol.id);
    if (success) {
      nameInp.value = "";
      keyInp.value  = "";
      nameInp.focus();
      this.selectedThemeCommand = this._getAvailableThemeCommand() || this.selectedThemeCommand;
      this._refreshThemePicker();
      if (statusEl) statusEl.textContent = "";
    } else if (statusEl) {
      statusEl.textContent = "That key is invalid, already in use, or the lobby is full.";
    }
  }

  _refreshLobbyPlayers() {
    const container = this.root.querySelector("#playerSlots");
    if (!container) return;

    const players = this.engine.getPlayers();
    this._syncSelectedThemeAfterRosterChange();
    const keyboard = this.root.querySelector("#holoKeyboardMount");
    if (keyboard) {
      keyboard.innerHTML = renderHolographicKeyboard(players, { title: "LOCAL KEYBOARD MATRIX", draggable: true });
      this._wireKeyboardKeys();
      const activeInput = this.root.querySelector("#playerName:focus, #playerKey:focus");
      if (activeInput) syncKeyboardInputHighlights(this.root, activeInput.value.slice(-1));
    }

    container.innerHTML = this._renderDockedPlayerSlots(players);

    // Remove buttons
    container.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        this.engine.removePlayer(btn.dataset.id);
      });
    });

    // Enable/disable start button
    const startBtn = this.root.querySelector("#startGameBtn");
    if (startBtn) startBtn.disabled = players.length < 2 || !players.every(p => p.ready);
    this._refreshThemePicker();
  }

  _renderDockedPlayerSlots(players) {
    const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
    return positions.map((position, index) => {
      const p = players[index];
      if (!p) {
        return `<div class="player-slot-dock player-slot-dock--${position} player-slot-dock--empty" aria-hidden="true"></div>`;
      }

      return `
        <div class="player-slot-dock player-slot-dock--${position}">
          <div class="player-slot ${p.ready ? "player-slot--ready" : ""}" style="--player-color:${p.color}; border-color:${p.color}">
            <span class="player-slot-name" style="color:${p.color}">${this._esc(p.name)}</span>
            <span class="player-slot__protocol">${this._esc(this.themePalette.find((protocol) => protocol.id === p.themeCommand)?.label || "Custom")}</span>
            <button class="btn-remove player-slot__remove" type="button" aria-label="Remove ${this._esc(p.name)}" data-id="${p.id}">&times;</button>
          </div>
        </div>
      `;
    }).join("");
  }

  _wireKeyboardKeys() {
    const keyInp = this.root.querySelector("#playerKey");
    if (!keyInp) return;

    this.root.querySelectorAll(".holo-key").forEach((button) => {
      button.addEventListener("click", () => {
        keyInp.value = normalizeGameKey(button.dataset.key || "").toUpperCase();
        keyInp.focus();
        syncKeyboardInputHighlights(this.root, keyInp.value);
      });

      button.addEventListener("dragstart", (event) => {
        if (button.dataset.draggable !== "true") {
          event.preventDefault();
          return;
        }

        button.classList.add("holo-key--dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", button.dataset.playerId || "");
        event.dataTransfer.setData("application/x-player-color", button.style.getPropertyValue("--key-color"));
      });

      button.addEventListener("dragend", () => {
        button.classList.remove("holo-key--dragging");
        this.root.querySelectorAll(".holo-key--drop-target").forEach((key) => {
          key.classList.remove("holo-key--drop-target");
          key.style.removeProperty("--drop-color");
        });
      });

      button.addEventListener("dragover", (event) => {
        if (button.dataset.occupied === "true") return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        button.style.setProperty("--drop-color", event.dataTransfer.getData("application/x-player-color"));
        button.classList.add("holo-key--drop-target");
      });

      button.addEventListener("dragleave", () => {
        button.classList.remove("holo-key--drop-target");
        button.style.removeProperty("--drop-color");
      });

      button.addEventListener("drop", (event) => {
        event.preventDefault();
        button.classList.remove("holo-key--drop-target");
        button.style.removeProperty("--drop-color");

        const playerId = event.dataTransfer.getData("text/plain");
        const targetKey = normalizeGameKey(button.dataset.key || "");
        if (playerId && targetKey && this.engine.movePlayerKey(playerId, targetKey)) {
          keyInp.value = targetKey.toUpperCase();
        }
      });
    });
  }

  /* ───────── In-game screens ───────── */

  _onGameStarted() {
    announceMatchState(true);
    this.matchStartedAt = Date.now();
    this.matchRecorded = false;

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
    announceMatchState(false);
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
