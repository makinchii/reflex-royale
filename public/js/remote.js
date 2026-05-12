/**
 * remote.js - Client for server-authoritative online lobby play.
 */
import { normalizeGameKey, pulseKeyboardKey, renderHolographicKeyboard, syncKeyboardInputHighlights } from "./keyMap.js";
import { getCurrentLocalThemeCommand, getLocalPlayerThemePalette } from "./localThemePalette.js";
import { recordRecentMatch } from "./recentMatches.js";

const VERIFIER_KEY = "reflexRoyaleVerifier";
const HOST_RECLAIM_KEY = "reflexRoyaleHostReclaimToken";
const ROOM_CODE_KEY = "reflexRoyaleRoomCode";
const PLAYER_NAME_KEY = "reflexRoyalePlayerName";
const PREFERRED_KEY_KEY = "reflexRoyalePreferredKey";
const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";
const MATCH_TRANSITION_EVENT = "reflex-royale-local-transition";
const MATCH_TRANSITION_DURATION_MS = 3000;
const MATCH_PLAYER_SPLASH_DURATION_MS = 2800;
const CHAT_LIMIT = 250;

if (window.__reflexRoyaleRemoteCleanup) {
  window.__reflexRoyaleRemoteCleanup();
}

const socket = io();

const root = document.getElementById("game-root");
let myPlayerId = null;
let isHost = false;
let roomState = null;
let selectedKey = null;
let verifier = localStorage.getItem(VERIFIER_KEY) || crypto.randomUUID();
localStorage.setItem(VERIFIER_KEY, verifier);
let hostReclaimToken = localStorage.getItem(HOST_RECLAIM_KEY) || "";
let savedRoomCode = localStorage.getItem(ROOM_CODE_KEY) || "";
let savedPlayerName = localStorage.getItem(PLAYER_NAME_KEY) || "";
let autoReconnectEnabled = true;
let matchRecorded = false;
let matchStartedAt = 0;
let pendingJoinSource = null;
let roomEntryMode = "join";
let selectedThemeCommand = getCurrentLocalThemeCommand();
let selectedEntryRoundCount = 5;
let closeThemePickerOnOutsideClick = null;
const themePalette = getLocalPlayerThemePalette();

function announceMatchState(inProgress) {
  window.dispatchEvent(new CustomEvent(AUDIO_MATCH_STATE_EVENT, { detail: { inProgress } }));
}

function getPreferredKey() {
  return normalizeGameKey(localStorage.getItem(PREFERRED_KEY_KEY) || "");
}

function getSelectedThemeProtocol() {
  return themePalette.find((protocol) => protocol.id === selectedThemeCommand) || themePalette[0] || null;
}

function getPreferredPlayerOptions() {
  const protocol = getSelectedThemeProtocol();
  return {
    preferredKey: getPreferredKey(),
    preferredThemeCommand: protocol?.id || "tron",
    preferredThemeColor: protocol?.color || "#00d4ff",
  };
}

attemptAutoReconnect();
window.__reflexRoyaleLegacyReady = true;
window.dispatchEvent(new Event("reflex-royale-legacy-ready"));

function attemptAutoReconnect() {
  if (autoReconnectEnabled && savedRoomCode && savedPlayerName) {
    renderJoinScreen();
    pendingJoinSource = "auto";
    socket.emit("joinRoom", {
      name: savedPlayerName,
      room: savedRoomCode,
      verifier,
      hostReclaimToken,
      ...getPreferredPlayerOptions()
    });
    return;
  }

  renderJoinScreen();
}

function renderJoinScreen(message = "") {
  announceMatchState(false);
  roomState = null;
  const isCreateMode = roomEntryMode === "create";
  root.innerHTML = `
    <div class="lobby">
      <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
      <p class="subtitle">Online Mode — Join a Room</p>
      <div class="room-entry-tabs" role="tablist" aria-label="Room entry mode">
        <button id="createTabBtn" type="button" class="room-entry-tab ${isCreateMode ? "room-entry-tab--active" : ""}" role="tab" aria-selected="${isCreateMode}">Create</button>
        <button id="joinTabBtn" type="button" class="room-entry-tab ${!isCreateMode ? "room-entry-tab--active" : ""}" role="tab" aria-selected="${!isCreateMode}">Join</button>
      </div>
      <div class="lobby-form">
        <div class="online-entry-grid">
          <div class="input-row input-row--online-entry ${isCreateMode ? "input-row--create-room" : ""}">
            ${isCreateMode ? "" : `<input id="roomCode" type="text" placeholder="Room code" maxlength="6" autocomplete="off" />`}
            <input id="playerName" type="text" placeholder="Your name" maxlength="12" autocomplete="off" />
            ${isCreateMode ? `<button id="createRoomBtn" class="btn btn-primary">Create Room</button>` : `<button id="joinBtn" class="btn btn-primary">Join</button>`}
          </div>
        </div>
        ${renderThemePickerField()}
        ${isCreateMode ? renderRoundSlider(selectedEntryRoundCount, "Round count", "round-slider--create") : ""}
        <p class="hint">${isCreateMode ? "Create a room, claim a Chroma Sigil, then share the generated room code with friends." : "Enter a room code, claim a Chroma Sigil, then join on your own device."}</p>
      </div>
      <div id="holoKeyboardMount">${renderHolographicKeyboard([], { title: "ROOM ENTRY MATRIX" })}</div>
    </div>
  `;

  const roomInput = document.getElementById("roomCode");
  const nameInput = document.getElementById("playerName");
  wireInputKeyboardHighlights([roomInput, nameInput]);
  wireEntryKeyboardKeys([roomInput, nameInput]);

  document.getElementById("createTabBtn").addEventListener("click", () => {
    roomEntryMode = "create";
    renderJoinScreen();
  });

  document.getElementById("joinTabBtn").addEventListener("click", () => {
    roomEntryMode = "join";
    renderJoinScreen();
  });

  const createRoomBtn = document.getElementById("createRoomBtn");
  const createRoom = () => {
    const name = document.getElementById("playerName").value.trim();
    if (!name) return showPageNotification("Enter your name first.", "error");
    localStorage.setItem(PLAYER_NAME_KEY, name);
    socket.emit("createRoom", { name, verifier, totalRounds: selectedEntryRoundCount, ...getPreferredPlayerOptions() });
  };
  if (createRoomBtn) createRoomBtn.addEventListener("click", createRoom);

  const joinBtn = document.getElementById("joinBtn");
  const joinRoom = () => {
    const name = document.getElementById("playerName").value.trim();
    const room = document.getElementById("roomCode").value.trim().toUpperCase();
    if (!name || !room) return showPageNotification("Enter both name and room code.", "error");
    localStorage.setItem(PLAYER_NAME_KEY, name);
    localStorage.setItem(ROOM_CODE_KEY, room);
    pendingJoinSource = "manual";
    socket.emit("joinRoom", { name, room, verifier, hostReclaimToken, ...getPreferredPlayerOptions() });
  };
  if (joinBtn) joinBtn.addEventListener("click", joinRoom);

  [roomInput, nameInput].filter(Boolean).forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (isCreateMode) {
        createRoom();
        return;
      }
      joinRoom();
    });
  });

  wireThemePickerDisclosure();
  renderThemePicker();
  wireRoundSlider((value) => {
    selectedEntryRoundCount = value;
  });
}

function clearSavedRoom() {
  localStorage.removeItem(ROOM_CODE_KEY);
  localStorage.removeItem(HOST_RECLAIM_KEY);
  savedRoomCode = "";
  hostReclaimToken = "";
}

function renderChatPanel() {
  return `
    <section class="chat-panel chat-panel--terminal" aria-label="Room chat terminal">
      <div class="chat-terminal-bar" aria-hidden="true">
        <span class="chat-terminal-led"></span>
        <span>CHAT://ROOM</span>
        <span class="chat-terminal-status">LIVE</span>
      </div>
      <div id="chatMessages" class="chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="input-row chat-command-row">
        <span class="chat-prompt" aria-hidden="true">&gt;</span>
        <input id="chatInput" type="text" placeholder="Press Enter to chat" maxlength="${CHAT_LIMIT}" autocomplete="off" aria-label="Chat message" />
        <span id="chatCharCounter" class="chat-char-counter" aria-live="polite">${CHAT_LIMIT}</span>
        <button id="sendChatBtn" class="btn btn-secondary">Send</button>
      </div>
    </section>
  `;
}

function getClaimedThemeCommands() {
  return new Set((roomState?.players || []).map((player) => player.themeCommand).filter(Boolean));
}

function getAvailableThemeCommand() {
  const claimed = getClaimedThemeCommands();
  return themePalette.find((protocol) => !claimed.has(protocol.id))?.id || null;
}

function syncSelectedThemeAfterRosterChange() {
  const currentPlayer = roomState?.players?.find((player) => player.id === myPlayerId);
  if (currentPlayer?.themeCommand) {
    selectedThemeCommand = currentPlayer.themeCommand;
    return;
  }

  const claimed = getClaimedThemeCommands();
  if (claimed.has(selectedThemeCommand)) selectedThemeCommand = getAvailableThemeCommand() || selectedThemeCommand;
}

function renderThemePicker() {
  const tabs = document.getElementById("themePickerTabs");
  const label = document.getElementById("themePickerButtonLabel");
  const button = document.getElementById("themePickerButton");
  const field = document.querySelector(".chroma-sigil-field");
  const keyboard = document.getElementById("holoKeyboardMount");
  if (!tabs || !label || !button) return;

  syncSelectedThemeAfterRosterChange();
  const claimed = getClaimedThemeCommands();
  const currentPlayer = roomState?.players?.find((player) => player.id === myPlayerId);
  const selected = getSelectedThemeProtocol();
  const selectedColor = selected?.color || "var(--primary, #68e8ff)";
  label.textContent = selected?.label || "All Claimed";
  button.style.setProperty("--sigil-color", selectedColor);
  field?.style.setProperty("--sigil-color", selectedColor);
  keyboard?.style.setProperty("--keyboard-accent", selectedColor);
  button.disabled = !selected;

  tabs.innerHTML = themePalette.map((protocol) => {
    const claimedByOther = claimed.has(protocol.id) && currentPlayer?.themeCommand !== protocol.id;
    const active = protocol.id === selectedThemeCommand && !claimedByOther;
    const claimedByPlayer = currentPlayer?.themeCommand === protocol.id;
    return `
      <button
        class="chroma-sigil-tab ${active || claimedByPlayer ? "is-active" : ""} ${claimedByOther || claimedByPlayer ? "is-claimed" : ""}"
        type="button"
        role="tab"
        aria-selected="${active || claimedByPlayer}"
        data-theme-command="${protocol.id}"
        style="--sigil-color:${protocol.color}"
        ${claimedByOther ? "disabled" : ""}
      >
        <span class="chroma-sigil-tab__swatch" aria-hidden="true"></span>
        <span>${protocol.label}</span>
      </button>
    `;
  }).join("");

  tabs.querySelectorAll(".chroma-sigil-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const command = tab.dataset.themeCommand;
      const protocol = themePalette.find((item) => item.id === command);
      if (!protocol || tab.disabled) return;
      selectedThemeCommand = protocol.id;
      if (roomState && myPlayerId) socket.emit("bindTheme", { themeCommand: protocol.id, color: protocol.color });
      renderThemePicker();
    });
  });
}

function renderThemePickerField() {
  return `
    <div class="chroma-sigil-field">
      <button id="themePickerButton" class="btn btn-secondary chroma-sigil-button" type="button" aria-expanded="false" aria-haspopup="dialog" aria-controls="themePickerPanel">
        <span class="chroma-sigil-summary__label">Chroma Sigil:</span>
        <span id="themePickerButtonLabel" class="chroma-sigil-summary__name"></span>
      </button>
      <div id="themePickerPanel" class="chroma-sigil-panel" role="dialog" aria-label="Choose Chroma Sigil" hidden>
        <div id="themePickerTabs" class="chroma-sigil-tabs" role="tablist" aria-label="Player color protocol"></div>
      </div>
    </div>
  `;
}

function wireThemePickerDisclosure() {
  cleanupThemePickerDisclosure();
  const themeBtn = document.getElementById("themePickerButton");
  const themePanel = document.getElementById("themePickerPanel");
  if (!themeBtn || !themePanel) return;

  themeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !themePanel.hidden;
    themePanel.hidden = isOpen;
    themeBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  closeThemePickerOnOutsideClick = (event) => {
    if (themePanel.hidden) return;
    const target = event.target;
    if (target instanceof Node && (themePanel.contains(target) || themeBtn.contains(target))) return;
    themePanel.hidden = true;
    themeBtn.setAttribute("aria-expanded", "false");
  };
  document.addEventListener("click", closeThemePickerOnOutsideClick);
}

function cleanupThemePickerDisclosure() {
  if (!closeThemePickerOnOutsideClick) return;
  document.removeEventListener("click", closeThemePickerOnOutsideClick);
  closeThemePickerOnOutsideClick = null;
}

function renderRoundSlider(value, label = "Round count", modifier = "", inputId = "roundCountInput") {
  const valueId = `${inputId}Value`;
  return `
    <div data-slot="tron-slider" class="round-slider ${modifier}" aria-label="Round count slider">
      <div class="round-slider__header">
        <span class="round-control">${label}</span>
        <span id="${valueId}" class="round-slider__value">${value}</span>
      </div>
      <div class="round-slider__track-wrap">
        <div data-slot="slider-track" class="round-slider__track"></div>
        <div data-slot="slider-range" class="round-slider__range" style="width: 0%"></div>
        <div data-slot="slider-thumb" class="round-slider__thumb" style="left: 0%"></div>
        <input id="${inputId}" class="round-slider__input" type="range" min="1" max="20" step="1" value="${value}" />
      </div>
    </div>
  `;
}

function wireRoundSlider(inputId = "roundCountInput", onChange) {
  if (typeof inputId === "function") {
    onChange = inputId;
    inputId = "roundCountInput";
  }

  const roundCountInput = document.getElementById(inputId);
  if (!roundCountInput) return;
  const slider = roundCountInput.closest('[data-slot="tron-slider"]');
  const roundCountInputValue = slider?.querySelector(".round-slider__value");

  const updateRoundSlider = () => {
    const min = Number(roundCountInput.min || 1);
    const max = Number(roundCountInput.max || 20);
    const current = Number(roundCountInput.value || 1);
    const percent = ((current - min) / (max - min)) * 100;

    if (roundCountInputValue) roundCountInputValue.textContent = String(current);
    const range = slider?.querySelector('[data-slot="slider-range"]');
    const thumb = slider?.querySelector('[data-slot="slider-thumb"]');
    if (range) range.style.width = `${percent}%`;
    if (thumb) thumb.style.left = `${percent}%`;
    if (onChange) onChange(current);
  };

  roundCountInput.addEventListener("input", updateRoundSlider);
  updateRoundSlider();
}

function renderPreferenceConflictDialog(unavailable = []) {
  const existing = document.getElementById("preferenceConflictDialog");
  if (existing) existing.remove();
  const names = unavailable.map((item) => item === "theme" ? "Chroma Sigil" : "preferred key");
  const message = names.length === 2
    ? "Your saved Chroma Sigil and preferred key are already claimed in this room. Pick open replacements before readying up."
    : `Your saved ${names[0] || "preference"} is already claimed in this room. Pick an open replacement before readying up.`;

  document.body.insertAdjacentHTML("beforeend", `
    <div id="preferenceConflictDialog" class="preference-conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="preferenceConflictTitle">
      <div class="preference-conflict-dialog__panel">
        <h2 id="preferenceConflictTitle">Preference Collision</h2>
        <p>${esc(message)}</p>
        <button id="preferenceConflictClose" type="button" class="btn btn-primary">Choose Manually</button>
      </div>
    </div>
  `);

  document.getElementById("preferenceConflictClose")?.addEventListener("click", () => {
    document.getElementById("preferenceConflictDialog")?.remove();
    document.getElementById(unavailable.includes("theme") ? "themePickerButton" : "keyInput")?.focus();
  });
}

function renderLobby(state) {
  announceMatchState(false);
  roomState = state;
  const currentPlayer = state.players.find((player) => player.id === myPlayerId);
  selectedKey = normalizeGameKey(currentPlayer?.keyBinding || selectedKey || "") || null;
  const readyText = `${state.readyCount}/${Math.max(state.playerCount, 2)} ready`;
  const roundText = `Rounds: ${state.totalRounds}`;
  const waitingText = state.waitingFor?.length ? `Waiting for: ${state.waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  const canToggleReady = Boolean(currentPlayer?.hasKeyBinding);
  const hostRoundControls = isHost ? `
    <section class="online-host-controls" aria-label="Host controls">
      <div class="host-control host-control--rounds">
        ${renderRoundSlider(state.totalRounds, "Round count", "round-slider--host", "hostRoundCountInput")}
      </div>
      <button id="applyRoundCountBtn" class="btn btn-secondary">Update Rounds</button>
      <button id="closeRoomBtn" class="btn btn-secondary">Close Room</button>
    </section>
  ` : "";
  root.innerHTML = `
      <div class="lobby lobby--online-room">
        <div class="lobby-layout-top">
          <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
          <p class="subtitle">Room ${esc(state.room)}</p>
          <p id="roomHint" class="hint">${esc(readyText)} · ${esc(roundText)}</p>
          <p id="waitingHint" class="hint">${esc(waitingText)}</p>
        </div>

        <div class="lobby-player-grid">
          <div id="remotePlayerSlots" class="player-slots player-slots--grid" aria-label="Player slots"></div>

          <div class="lobby-control-stack">
            <div class="lobby-form">
              <div class="input-row input-row--online-key-card">
                <input id="keyInput" type="text" placeholder="Pick your key" maxlength="1" autocomplete="off" value="${selectedKey ? esc(selectedKey.toUpperCase()) : ""}" />
                <button id="bindKeyBtn" class="btn btn-secondary">Set Key</button>
                <button id="readyBtn" class="btn btn-primary" ${canToggleReady ? "" : "disabled"}>${currentPlayer?.isReady ? "Unready" : canToggleReady ? "Ready Up" : "Set Key First"}</button>
              </div>
              ${renderThemePickerField()}
              <p class="hint">Click a holographic key or press a character key, claim a Chroma Sigil, then set it. Press your assigned key to toggle ready.</p>
            </div>
          </div>
        </div>

        ${isHost ? `
          <aside class="online-host-terminal" aria-label="Host terminal">
            ${hostRoundControls}
            <button id="startGameBtn" class="btn btn-primary btn-go" ${state.canStart ? "" : "disabled"}>Start Game</button>
          </aside>
        ` : ""}

        <div id="holoKeyboardMount">${renderHolographicKeyboard(state.players, { currentPlayerId: myPlayerId, draggable: true, title: "Room Buzzer Matrix" })}</div>

      ${renderChatPanel()}

    </div>
  `;

  const readyBtn = document.getElementById("readyBtn");
  if (readyBtn) readyBtn.addEventListener("click", () => socket.emit("toggleReady"));

  const bindKeyBtn = document.getElementById("bindKeyBtn");
  if (bindKeyBtn) {
    bindKeyBtn.addEventListener("click", () => {
      const input = document.getElementById("keyInput");
      const key = normalizeGameKey(input.value.trim());
      if (!key) return showPageNotification("Pick a single key first.", "error");
      socket.emit("bindKey", { key });
    });
  }

  const keyInput = document.getElementById("keyInput");
  if (keyInput) {
    keyInput.addEventListener("keydown", (event) => {
      event.preventDefault();
      keyInput.value = normalizeGameKey(event.key).toUpperCase();
    });
    keyInput.addEventListener("input", () => {
      keyInput.value = normalizeGameKey(keyInput.value).toUpperCase();
      syncKeyboardInputHighlights(root, keyInput.value);
    });
    wireInputKeyboardHighlights([keyInput]);
  }

  wireThemePickerDisclosure();
  renderThemePicker();

  wireKeyboardKeys();

  wireChatControls();

  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) startBtn.addEventListener("click", () => socket.emit("startGame"));

  const applyRoundCountBtn = document.getElementById("applyRoundCountBtn");
  if (applyRoundCountBtn) {
    applyRoundCountBtn.addEventListener("click", () => {
      const input = document.getElementById("hostRoundCountInput");
      const totalRounds = Number.parseInt(input?.value || "", 10);
      if (!Number.isFinite(totalRounds) || totalRounds < 1 || totalRounds > 20) {
        return showPageNotification("Round count must be between 1 and 20.", "error");
      }
      socket.emit("setRoundCount", { totalRounds });
    });
  }

  wireRoundSlider("hostRoundCountInput");

  const closeBtn = document.getElementById("closeRoomBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => socket.emit("closeRoom"));

  renderRoster(state.players);
  renderChat(state.chatMessages || []);
}

function renderRoster(players) {
  const container = document.getElementById("remotePlayerSlots");
  if (!container) return;

  if (container.classList.contains("player-slots--grid") || container.classList.contains("player-slots--docked")) {
    container.innerHTML = renderDockedRoster(players);
    wireRosterRemoveButtons(container);
    return;
  }

  container.innerHTML = players.map((player) => `
    ${renderRosterSlot(player)}
  `).join("");
  wireRosterRemoveButtons(container);
}

function renderRosterSlot(player) {
  const canRemove = isHost && player.id !== myPlayerId;
  return `
    <div class="player-slot ${player.isReady ? "player-slot--ready" : ""} ${canRemove ? "player-slot--removable" : ""}" style="--player-color:${player.color}; border-color:${player.color}; opacity:${player.connected ? 1 : 0.55}">
      <span class="player-slot-name" style="color:${player.color}">${esc(player.name)}</span>
      <span class="player-slot__protocol">${esc(themePalette.find((protocol) => protocol.id === player.themeCommand)?.label || "Custom")}</span>
      ${canRemove ? `<button class="btn-remove player-slot__remove" type="button" aria-label="Remove ${esc(player.name)}" data-remove-id="${player.id}"></button>` : ""}
    </div>
  `;
}

function wireRosterRemoveButtons(container) {
  container.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => {
      socket.emit("removePlayer", { playerId: button.dataset.removeId });
    });
  });
}

function renderDockedRoster(players) {
  const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const host = players.find((player) => player.id === roomState?.hostId) || players[0] || null;
  const ordered = host ? [host, ...players.filter((player) => player.id !== host.id)] : players;

  const cards = positions.map((position, index) => {
    const player = ordered[index];
    if (!player) {
      return `<div class="player-slot-dock player-slot-dock--${position} player-slot-dock--empty" aria-hidden="true"></div>`;
    }

    return `
      <div class="player-slot-dock player-slot-dock--${position}">
        ${renderRosterSlot(player)}
      </div>
    `;
  });

  return `
    <div class="player-slot-stack player-slot-stack--left">
      ${cards[0]}
      ${cards[2]}
    </div>
    <div class="player-slot-stack player-slot-stack--right">
      ${cards[1]}
      ${cards[3]}
    </div>
  `;
}

function renderHostControls(players, actionLabel = "Remove") {
  const container = document.getElementById("hostRosterControls");
  if (!container || !isHost) return;

  const removable = players.filter((player) => player.id !== myPlayerId);
  container.innerHTML = removable.length ? removable.map((player) => `
    <button class="btn btn-secondary" data-remove-id="${player.id}">${actionLabel} ${esc(player.name)}</button>
  `).join("") : `<p class="hint">No players to remove.</p>`;

  container.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => {
      socket.emit("removePlayer", { playerId: button.dataset.removeId });
    });
  });
}

function renderMatchHostControls() {
  return isHost && roomState?.players?.length ? `
    <aside class="online-host-controls online-match-host-controls" aria-label="Host controls">
      <div id="hostRosterControls" class="game-over-actions"></div>
    </aside>
  ` : "";
}

function dispatchMatchTransition(players = roomState?.players || [], duration = MATCH_TRANSITION_DURATION_MS, splashDuration = MATCH_PLAYER_SPLASH_DURATION_MS) {
  const transitionPlayers = players.map((player) => {
    const theme = themePalette.find((protocol) => protocol.id === player.themeCommand);
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      themeCommand: player.themeCommand,
      themeLabel: theme?.label || player.themeCommand || "Custom",
      key: player.keyBinding,
    };
  });

  window.dispatchEvent(new CustomEvent(MATCH_TRANSITION_EVENT, {
    detail: { duration, splashDuration, players: transitionPlayers },
  }));
}

function renderChat(messages = []) {
  const container = document.getElementById("chatMessages");
  if (!container) return;
  const playerColors = new Map((roomState?.players || []).map((player) => [player.id, player.color]));

  container.innerHTML = messages.length
    ? messages.map((message) => `
      <div class="chat-message">
        <span class="chat-sender" style="--chat-sender-color: ${esc(playerColors.get(message.senderPlayerId) || message.senderColor || "var(--primary, #68e8ff)")}">${esc(message.senderName || "Player")}:</span>
        <span class="chat-content">${esc(message.content)}</span>
      </div>
    `).join("")
    : `<p class="hint">No chat yet.</p>`;
  container.scrollTop = container.scrollHeight;
}

function wireChatControls() {
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");
  const chatCharCounter = document.getElementById("chatCharCounter");
  if (!chatInput || !sendChatBtn) return;

  const updateCounter = () => {
    if (!chatCharCounter) return;
    chatCharCounter.textContent = String(CHAT_LIMIT - chatInput.value.length);
  };

  const sendChat = () => {
    const content = chatInput.value.trim();
    if (!content) return;
    socket.emit("sendChatMessage", { content });
    chatInput.value = "";
    updateCounter();
  };

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChat();
    }
  });

  chatInput.addEventListener("input", updateCounter);
  sendChatBtn.addEventListener("click", sendChat);
  updateCounter();
}

function focusChatInputFromShortcut() {
  const chatInput = document.getElementById("chatInput");
  if (!chatInput) return false;

  chatInput.focus();
  chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
  return true;
}

function renderMatchScreen(message, lightClass) {
  const isGreen = lightClass.includes("green");
  const isRed = lightClass.includes("red");
  const isFlash = lightClass.includes("flash");
  const isCountdown = !isGreen && !isRed;
  const arenaClass = isGreen ? "arena-solo arena-solo--react" : isRed ? "arena-solo arena-solo--waiting" : "arena-solo arena-solo--countdown";
  const signalAttr = isCountdown ? ` data-signal="${esc(message)}"` : "";
  const feedback = isFlash ? `<span class="false-start">${message}</span>` : "";

  root.innerHTML = `
    <div class="online-state online-state--match">
      <div class="online-state__center">
        <div class="${arenaClass}">
          <div class="player-panel-solo"${signalAttr}>
            <div class="panel-light">
              <div class="light-circle ${lightClass}"></div>
            </div>
          </div>
          <div class="solo-feedback">${feedback}</div>
        </div>
      </div>
      ${renderMatchHostControls()}
      ${renderChatPanel()}
    </div>
  `;

  wireChatControls();
  renderChat(roomState?.chatMessages || []);
  renderHostControls(roomState?.players || [], "Kick");
}

function renderPostMatchScreen(state) {
  const currentPlayer = state.players.find((player) => player.id === myPlayerId);
  const waitingText = state.waitingFor?.length ? `Waiting for: ${state.waitingFor.join(", ")}` : "Everyone is back in the lobby.";

  root.innerHTML = `
      <div class="online-state online-state--post-match">
        <div class="online-state__center">
          <div class="game-over">
            <h1 class="winner-banner">Room ${esc(state.room)}</h1>
            <p class="hint">${esc(waitingText)}</p>
            <p class="hint">Rounds: ${state.totalRounds}</p>
            <div class="game-over-actions">
              <button id="returnLobbyBtn" class="btn btn-primary btn-big">${currentPlayer?.isInLobbyView ? "Back in Lobby" : "Return to Lobby"}</button>
              <button id="leaveRoomBtn" class="btn btn-secondary">Leave Room</button>
            </div>
            ${isHost ? '<div id="hostRosterControls" class="game-over-actions"></div>' : ""}
            <div id="remotePlayerSlots" class="player-slots"></div>
            <table class="standings-table">
              <thead><tr>
                <th>#</th><th>Player</th><th>Score</th><th>Wins</th>
                <th>Best</th><th>Avg</th><th>False Starts</th>
              </tr></thead>
              <tbody>
                ${(state.standings || []).map((s, i) => `
                  <tr style="color:${s.color}" class="${i === 0 ? 'first-place' : ''}${s.id === myPlayerId ? ' you-row' : ''}">
                    <td>${i + 1}</td><td>${esc(s.name)}</td><td>${s.totalScore}</td>
                    <td>${s.wins}</td><td>${s.bestTime !== null ? s.bestTime + " ms" : "—"}</td>
                    <td>${s.avgTime !== null ? s.avgTime + " ms" : "—"}</td><td>${s.falseStarts}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
        ${renderChatPanel()}
      </div>
  `;

  document.getElementById("returnLobbyBtn").addEventListener("click", () => socket.emit("requestLobbyView"));
  document.getElementById("leaveRoomBtn").addEventListener("click", () => {
    autoReconnectEnabled = false;
    socket.emit("leaveRoom");
  });
  wireChatControls();
  renderChat(state.chatMessages || []);
  renderRoster(state.players);
  renderHostControls(state.players);
}

socket.on("roomCreated", ({ room, playerId, verifier: createdVerifier }) => {
  pendingJoinSource = null;
  myPlayerId = playerId;
  isHost = true;
  verifier = createdVerifier || verifier;
  localStorage.setItem(VERIFIER_KEY, verifier);
  if (room.hostReclaimToken) {
    hostReclaimToken = room.hostReclaimToken;
    localStorage.setItem(HOST_RECLAIM_KEY, hostReclaimToken);
  }
  localStorage.setItem(ROOM_CODE_KEY, room.room);
  localStorage.setItem(PLAYER_NAME_KEY, room.players.find((player) => player.id === playerId)?.name || savedPlayerName || "");
  selectedKey = null;
  autoReconnectEnabled = true;
  renderLobby(room);
  renderChat(room.chatMessages || []);
});

socket.on("roomJoined", ({ room, playerId }) => {
  pendingJoinSource = null;
  myPlayerId = playerId;
  isHost = room.hostId === playerId;
  savedRoomCode = room.room;
  savedPlayerName = room.players.find((player) => player.id === playerId)?.name || savedPlayerName;
  localStorage.setItem(ROOM_CODE_KEY, room.room);
  if (savedPlayerName) localStorage.setItem(PLAYER_NAME_KEY, savedPlayerName);
  if (room.hostReclaimToken) {
    hostReclaimToken = room.hostReclaimToken;
    localStorage.setItem(HOST_RECLAIM_KEY, hostReclaimToken);
  }
  selectedKey = null;
  autoReconnectEnabled = true;
  renderLobby(room);
  renderChat(room.chatMessages || []);
});

socket.on("roomState", (state) => {
  if (!myPlayerId) return;
  roomState = state;
  isHost = state.hostId === myPlayerId;

  const currentPlayer = state.players.find((player) => player.id === myPlayerId);

  if (state.status === "waiting_for_players" || state.status === "ready_check") {
    renderLobby(state);
    renderChat(state.chatMessages || []);
  } else if (state.status === "post_match") {
    if (currentPlayer?.isInLobbyView || state.players.length <= 1) {
      renderLobby(state);
    } else {
      renderPostMatchScreen(state);
    }
    renderChat(state.chatMessages || []);
  }
});

socket.on("keyBound", ({ key }) => {
  selectedKey = normalizeGameKey(key);
  if (roomState && (roomState.status === "waiting_for_players" || roomState.status === "ready_check")) {
    renderLobby(roomState);
  }
});

socket.on("themeBound", ({ themeCommand, color }) => {
  if (themeCommand) selectedThemeCommand = themeCommand;
  const currentPlayer = roomState?.players?.find((player) => player.id === myPlayerId);
  if (currentPlayer && themeCommand) {
    currentPlayer.themeCommand = themeCommand;
    if (color) currentPlayer.color = color;
  }
  if (roomState && (roomState.status === "waiting_for_players" || roomState.status === "ready_check")) {
    renderLobby(roomState);
  }
});

socket.on("preferenceConflict", ({ unavailable }) => {
  renderPreferenceConflictDialog(unavailable || []);
});

socket.on("matchStarting", ({ players, duration, splashDuration }) => {
  announceMatchState(true);
  if (!matchStartedAt) {
    matchStartedAt = Date.now();
    matchRecorded = false;
  }
  dispatchMatchTransition(players || roomState?.players || [], duration, splashDuration);
});

socket.on("playerList", ({ players }) => {
  roomState = roomState || { players: [] };
  roomState.players = players;
  syncSelectedThemeAfterRosterChange();
  renderRoster(players);
  renderHostControls(players, roomState?.status === "countdown" || roomState?.status === "waiting" || roomState?.status === "react" ? "Kick" : "Remove");
  renderThemePicker();

  const hint = document.getElementById("roomHint");
  if (hint && roomState?.readyCount !== undefined) {
    hint.textContent = `${roomState.readyCount}/${Math.max(roomState.playerCount, 2)} ready · Rounds: ${roomState.totalRounds}`;
  }

  const waitingHint = document.getElementById("waitingHint");
  if (waitingHint && roomState?.waitingFor) {
    waitingHint.textContent = roomState.waitingFor.length ? `Waiting for: ${roomState.waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  }
});

socket.on("chatMessage", ({ messages }) => {
  if (roomState) {
    roomState.chatMessages = messages || roomState.chatMessages || [];
  }
  renderChat(messages || roomState?.chatMessages || []);
});

socket.on("lobbyStatus", ({ waitingFor }) => {
  const waitingHint = document.getElementById("waitingHint");
  if (waitingHint) {
    waitingHint.textContent = waitingFor?.length ? `Waiting for: ${waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  }

  if (roomState?.status === "post_match") {
    roomState.waitingFor = waitingFor || [];
    const currentPlayer = roomState.players.find((player) => player.id === myPlayerId);
    if (currentPlayer?.isInLobbyView || roomState.players.length <= 1) {
      renderLobby(roomState);
    } else {
      renderPostMatchScreen(roomState);
    }
  }
});

socket.on("removedFromLobby", () => {
  autoReconnectEnabled = false;
  myPlayerId = null;
  isHost = false;
  roomState = null;
  selectedKey = null;
  verifier = localStorage.getItem(VERIFIER_KEY) || verifier;
  savedRoomCode = "";
  savedPlayerName = "";
  localStorage.removeItem(ROOM_CODE_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
  localStorage.removeItem(HOST_RECLAIM_KEY);
  showPageNotification("You were kicked from the lobby.", "error");
  renderJoinScreen();
});

socket.on("countdown", ({ remaining }) => {
  announceMatchState(true);
  if (!matchStartedAt) {
    matchStartedAt = Date.now();
    matchRecorded = false;
  }
  renderMatchScreen(String(remaining), "off");
});

socket.on("waiting", () => {
  renderMatchScreen("Wait for it…", "red");
});

socket.on("react", () => {
  renderMatchScreen("GO!", "green");
});

socket.on("falseStart", ({ id }) => {
  if (id === myPlayerId) renderMatchScreen("Too early!", "red flash");
});

socket.on("playerReacted", ({ id, time }) => {
  if (id === myPlayerId) {
    const fb = root.querySelector(".solo-feedback");
    if (fb) fb.innerHTML = `<span class="reaction-time">${time} ms</span>`;
  }
});

socket.on("roundEnd", ({ roundNum, results }) => {
  root.innerHTML = `
  <div class="online-state online-state--round-end">
      <div class="online-state__center">
        <div class="round-results">
          <h2>Round ${roundNum} Results</h2>
          <ol class="results-list">
            ${results.map((r, i) => `
              <li class="${i === 0 && r.outcome === "valid" ? 'winner' : ''}${r.id === myPlayerId ? ' you' : ''}">
                <span class="result-name">${esc(r.name)}</span>
                <span class="result-time">${formatResult(r)}</span>
                <span class="result-points">${r.points ? "+" + r.points : "—"}</span>
              </li>
            `).join("")}
          </ol>
          <div class="game-over-actions">
            ${isHost ? '<button id="nextRoundBtn" class="btn btn-primary btn-big">Next Round</button>' : '<p class="hint">Waiting for host…</p>'}
          </div>
        </div>
      </div>
      ${renderMatchHostControls()}
      ${renderChatPanel()}
  </div>
  `;

  if (isHost) {
    document.getElementById("nextRoundBtn").addEventListener("click", () => socket.emit("nextRound"));
  }
  wireChatControls();
  renderChat(roomState?.chatMessages || []);
  renderHostControls(roomState?.players || [], "Kick");
});

socket.on("gameOver", ({ standings }) => {
  announceMatchState(false);
  recordOnlineRecentMatch(standings || []);

  root.innerHTML = `
    <div class="online-state online-state--game-over">
      <div class="online-state__center">
        <div class="game-over">
          <h1 class="winner-banner">🏆 ${esc(standings[0].name)} Wins! 🏆</h1>
          <table class="standings-table">
            <thead><tr>
              <th>#</th><th>Player</th><th>Score</th><th>Wins</th>
              <th>Best</th><th>Avg</th><th>False Starts</th>
            </tr></thead>
            <tbody>
              ${standings.map((s, i) => `
                <tr style="color:${s.color}" class="${i === 0 ? 'first-place' : ''}${s.id === myPlayerId ? ' you-row' : ''}">
                  <td>${i + 1}</td><td>${esc(s.name)}</td><td>${s.totalScore}</td>
                  <td>${s.wins}</td><td>${s.bestTime !== null ? s.bestTime + " ms" : "—"}</td>
                  <td>${s.avgTime !== null ? s.avgTime + " ms" : "—"}</td><td>${s.falseStarts}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="game-over-actions">
            <button id="returnLobbyBtn" class="btn btn-primary btn-big">Return to Lobby</button>
            ${isHost ? '<button id="playAgainBtn" class="btn btn-secondary">Play Again</button>' : ''}
          </div>
        </div>
      </div>
      ${renderMatchHostControls()}
      ${renderChatPanel()}
    </div>
  `;

  document.getElementById("returnLobbyBtn").addEventListener("click", () => socket.emit("requestLobbyView"));
  if (isHost) {
    document.getElementById("playAgainBtn").addEventListener("click", () => socket.emit("playAgain"));
  }
  wireChatControls();
  renderChat(roomState?.chatMessages || []);
  renderHostControls(roomState?.players || [], "Kick");
});

function recordOnlineRecentMatch(standings) {
  if (matchRecorded) return;
  const playerIndex = standings.findIndex((standing) => standing.id === myPlayerId);
  if (playerIndex < 0) return;

  const player = standings[playerIndex];
  if (!player.avgTime) return;
  const reactionTimes = (player.roundTimes || []).filter((time) => Number.isFinite(time) && time > 0);
  const totalReactionTime = reactionTimes.reduce((total, time) => total + time, 0);
  const matchDurationSeconds = matchStartedAt ? Math.max(1, Math.round((Date.now() - matchStartedAt) / 1000)) : 0;

  matchRecorded = true;

  recordRecentMatch({
    averageReactionTime: player.avgTime,
    falseStarts: player.falseStarts || 0,
    matchDurationSeconds,
    mode: "online",
    place: playerIndex + 1,
    reactions: reactionTimes.length,
    totalReactionTime,
  });
  matchStartedAt = 0;
}

socket.on("roomClosed", ({ reason }) => {
  announceMatchState(false);
  myPlayerId = null;
  isHost = false;
  roomState = null;
  selectedKey = null;
  if (reason === "left" || reason === "host_closed") {
    clearSavedRoom();
    localStorage.removeItem(PLAYER_NAME_KEY);
    savedPlayerName = "";
  }
  renderJoinScreen();
});

socket.on("error", ({ message }) => {
  if (pendingJoinSource === "auto" && message === "Room not found.") {
    pendingJoinSource = null;
    clearSavedRoom();
    renderJoinScreen();
    return;
  }

  pendingJoinSource = null;
  showPageNotification(message, "error");
});

const handleKeyDown = (e) => {
  const active = document.activeElement;
  if (active && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName)) {
    return;
  }

  if (e.key === "Enter" && focusChatInputFromShortcut()) {
    e.preventDefault();
    return;
  }

  const key = normalizeGameKey(e.key);
  if (!key) return;

  if (roomState && (roomState.status === "waiting_for_players" || roomState.status === "ready_check") && selectedKey) {
    if (key === selectedKey) {
      e.preventDefault();
      socket.emit("toggleReady");
    }
    return;
  }

  if (!roomState || (roomState.status !== "countdown" && roomState.status !== "waiting" && roomState.status !== "react")) return;

  if (selectedKey && key === selectedKey) {
    e.preventDefault();
    socket.emit("playerInput");
  }
};

function wireKeyboardKeys() {
  const keyInput = document.getElementById("keyInput");
  if (!keyInput) return;

  document.querySelectorAll(".holo-key").forEach((button) => {
    button.addEventListener("click", () => {
      keyInput.value = normalizeGameKey(button.dataset.key || "").toUpperCase();
      keyInput.focus();
      syncKeyboardInputHighlights(root, keyInput.value);
    });

    button.addEventListener("dragstart", (event) => {
      if (button.dataset.draggable !== "true") {
        event.preventDefault();
        return;
      }

      button.classList.add("holo-key--dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", button.dataset.key || "");
      event.dataTransfer.setData("application/x-player-color", button.style.getPropertyValue("--key-color"));
    });

    button.addEventListener("dragend", () => {
      button.classList.remove("holo-key--dragging");
      document.querySelectorAll(".holo-key--drop-target").forEach((key) => {
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

      const targetKey = normalizeGameKey(button.dataset.key || "");
      if (!targetKey || button.dataset.occupied === "true") return;

      keyInput.value = targetKey.toUpperCase();
      selectedKey = targetKey;
      socket.emit("bindKey", { key: targetKey });
    });
  });
}

function wireInputKeyboardHighlights(inputs) {
  inputs.filter(Boolean).forEach((input) => {
    input.addEventListener("keydown", (event) => pulseKeyboardKey(root, event.key));
    input.addEventListener("input", () => syncKeyboardInputHighlights(root, input.value));
  });
}

function wireEntryKeyboardKeys(inputs) {
  const focusableInputs = inputs.filter(Boolean);
  document.querySelectorAll(".holo-key").forEach((button) => {
    button.addEventListener("click", () => {
      const active = focusableInputs.includes(document.activeElement) ? document.activeElement : focusableInputs[0];
      if (!active) return;

      const key = normalizeGameKey(button.dataset.key || "").toUpperCase();
      const maxLength = Number(active.maxLength || 0);
      if (maxLength > 0 && active.value.length >= maxLength) return;

      active.value = `${active.value || ""}${key}`;
      active.focus();
      active.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

const handleTouchStart = (e) => {
  if (!roomState || (roomState.status !== "countdown" && roomState.status !== "waiting" && roomState.status !== "react")) return;
  if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
  socket.emit("playerInput");
};

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("touchstart", handleTouchStart);

const cleanupRemoteGame = () => {
  document.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("touchstart", handleTouchStart);
  cleanupThemePickerDisclosure();
  socket.removeAllListeners();
  socket.disconnect();
  if (window.__reflexRoyaleRemoteCleanup === cleanupRemoteGame) {
    window.__reflexRoyaleRemoteCleanup = undefined;
  }
};

window.__reflexRoyaleRemoteCleanup = cleanupRemoteGame;

function formatResult(result) {
  if (result.outcome === "false_start") return "False start!";
  if (result.outcome === "timeout") return "Missed!";
  if (result.outcome === "disconnected") return "Disconnected";
  return `${result.time} ms`;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
