/**
 * remote.js - Client for server-authoritative online lobby play.
 */

const VERIFIER_KEY = "reflexRoyaleVerifier";
const HOST_RECLAIM_KEY = "reflexRoyaleHostReclaimToken";
const ROOM_CODE_KEY = "reflexRoyaleRoomCode";
const PLAYER_NAME_KEY = "reflexRoyalePlayerName";
const CHAT_LIMIT = 280;

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

attemptAutoReconnect();
window.__reflexRoyaleLegacyReady = true;
window.dispatchEvent(new Event("reflex-royale-legacy-ready"));

function attemptAutoReconnect() {
  if (autoReconnectEnabled && savedRoomCode && savedPlayerName) {
    renderJoinScreen();
    socket.emit("joinRoom", {
      name: savedPlayerName,
      room: savedRoomCode,
      verifier,
      hostReclaimToken
    });
    return;
  }

  renderJoinScreen();
}

function renderJoinScreen(message = "") {
  root.innerHTML = `
    <div class="lobby">
      <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
      <p class="subtitle">Online Mode — Join a Room</p>
      <div class="lobby-form">
        <div class="input-row">
          <input id="roomCode" type="text" placeholder="Room code" maxlength="6" autocomplete="off" />
          <input id="playerName" type="text" placeholder="Your name" maxlength="12" autocomplete="off" />
          <button id="joinBtn" class="btn btn-primary">Join</button>
        </div>
        <p class="hint">Share the room code with friends so they can join on their own devices.</p>
        <button id="createRoomBtn" class="btn btn-secondary">Create New Room</button>
      </div>
    </div>
  `;

  document.getElementById("createRoomBtn").addEventListener("click", () => {
    const name = document.getElementById("playerName").value.trim();
    if (!name) return showPageNotification("Enter your name first.", "error");
    localStorage.setItem(PLAYER_NAME_KEY, name);
    socket.emit("createRoom", { name, verifier });
  });

  document.getElementById("joinBtn").addEventListener("click", () => {
    const name = document.getElementById("playerName").value.trim();
    const room = document.getElementById("roomCode").value.trim().toUpperCase();
    if (!name || !room) return showPageNotification("Enter both name and room code.", "error");
    localStorage.setItem(PLAYER_NAME_KEY, name);
    localStorage.setItem(ROOM_CODE_KEY, room);
    socket.emit("joinRoom", { name, room, verifier, hostReclaimToken });
  });
}

function renderLobby(state) {
  roomState = state;
  const currentPlayer = state.players.find((player) => player.id === myPlayerId);
  const readyText = `${state.readyCount}/${Math.max(state.playerCount, 2)} ready`;
  const roundText = `Rounds: ${state.totalRounds}`;
  const waitingText = state.waitingFor?.length ? `Waiting for: ${state.waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  const canToggleReady = Boolean(currentPlayer?.hasKeyBinding);
  const lobbyButtonText = currentPlayer?.isInLobbyView ? "Play Again" : "Return to Lobby";

  root.innerHTML = `
    <div class="lobby">
      <h1 class="game-title"><a href="/">Reflex Royale</a></h1>
      <p class="subtitle">Room ${esc(state.room)}</p>
      <p id="roomHint" class="hint">${esc(readyText)} · ${esc(roundText)}</p>
      <p id="waitingHint" class="hint">${esc(waitingText)}</p>
      <div id="remotePlayerSlots" class="player-slots"></div>
      ${isHost ? `<div id="hostRosterControls" class="game-over-actions"></div>` : ""}

      <div class="chat-panel">
        <div id="chatMessages" class="chat-messages"></div>
        <div class="input-row">
          <input id="chatInput" type="text" placeholder="Send a message" maxlength="${CHAT_LIMIT}" autocomplete="off" />
          <button id="sendChatBtn" class="btn btn-secondary">Send</button>
        </div>
      </div>

      <div class="lobby-form">
        <div class="input-row">
          <input id="keyInput" type="text" placeholder="Pick your key" maxlength="1" autocomplete="off" value="${selectedKey ? esc(selectedKey.toUpperCase()) : ""}" />
          <button id="bindKeyBtn" class="btn btn-secondary">Set Key</button>
          <button id="readyBtn" class="btn btn-primary" ${canToggleReady ? "" : "disabled"}>${currentPlayer?.isReady ? "Unready" : canToggleReady ? "Ready Up" : "Set Key First"}</button>
          <button id="returnLobbyBtn" class="btn btn-secondary">${lobbyButtonText}</button>
        </div>
        <p class="hint">Pick your buzzer key, then click the same key again to confirm ready.</p>
      </div>

      <div class="game-over-actions">
        ${isHost ? `
          <label class="host-control">Round count
            <input id="roundCountInput" type="number" min="1" max="20" value="${state.totalRounds}" />
          </label>
          <button id="applyRoundCountBtn" class="btn btn-secondary">Update Rounds</button>
          <button id="startGameBtn" class="btn btn-big btn-go" ${state.canStart ? "" : "disabled"}>Start Game</button>
          <button id="closeRoomBtn" class="btn btn-secondary">Close Room</button>
        ` : ""}
        <button id="leaveRoomBtn" class="btn btn-secondary">Leave Room</button>
      </div>
    </div>
  `;

  const readyBtn = document.getElementById("readyBtn");
  if (readyBtn) readyBtn.addEventListener("click", () => socket.emit("toggleReady"));

  const bindKeyBtn = document.getElementById("bindKeyBtn");
  if (bindKeyBtn) {
    bindKeyBtn.addEventListener("click", () => {
      const input = document.getElementById("keyInput");
      const key = input.value.trim().toLowerCase();
      if (!key) return showPageNotification("Pick a single key first.", "error");
      socket.emit("bindKey", { key });
    });
  }

  const keyInput = document.getElementById("keyInput");
  if (keyInput) {
    keyInput.addEventListener("keydown", (event) => {
      event.preventDefault();
      keyInput.value = event.key.length === 1 ? event.key.toUpperCase() : "";
    });
    keyInput.addEventListener("input", () => {
      keyInput.value = keyInput.value.slice(0, 1).toUpperCase();
    });
  }

  const returnLobbyBtn = document.getElementById("returnLobbyBtn");
  if (returnLobbyBtn) returnLobbyBtn.addEventListener("click", () => socket.emit("requestLobbyView"));

  wireChatControls();

  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  if (leaveRoomBtn) leaveRoomBtn.addEventListener("click", () => {
    autoReconnectEnabled = false;
    socket.emit("leaveRoom");
  });

  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) startBtn.addEventListener("click", () => socket.emit("startGame"));

  const applyRoundCountBtn = document.getElementById("applyRoundCountBtn");
  if (applyRoundCountBtn) {
    applyRoundCountBtn.addEventListener("click", () => {
      const input = document.getElementById("roundCountInput");
      socket.emit("setRoundCount", { totalRounds: input.value });
    });
  }

  const closeBtn = document.getElementById("closeRoomBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => socket.emit("closeRoom"));

  renderRoster(state.players);
  renderHostControls(state.players);
  renderChat(state.chatMessages || []);
}

function renderRoster(players) {
  const container = document.getElementById("remotePlayerSlots");
  if (!container) return;

  container.innerHTML = players.map((player) => `
    <div class="player-slot" style="border-color:${player.color}; opacity:${player.connected ? 1 : 0.55}">
      <span class="player-slot-name" style="color:${player.color}">${esc(player.name)}</span>
      ${player.isHost ? '<span class="you-tag">HOST</span>' : ''}
      ${player.id === myPlayerId ? '<span class="you-tag">YOU</span>' : ''}
      <span class="ready-state">${player.connected ? (player.isReady ? "Ready" : "Not ready") : "Disconnected"}</span>
    </div>
  `).join("");
}

function renderHostControls(players) {
  const container = document.getElementById("hostRosterControls");
  if (!container || !isHost) return;

  const removable = players.filter((player) => player.id !== myPlayerId);
  container.innerHTML = removable.length ? removable.map((player) => `
    <button class="btn btn-secondary" data-remove-id="${player.id}">Remove ${esc(player.name)}</button>
  `).join("") : `<p class="hint">No players to remove.</p>`;

  container.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => {
      socket.emit("removePlayer", { playerId: button.dataset.removeId });
    });
  });
}

function renderChat(messages = []) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  container.innerHTML = messages.length
    ? messages.map((message) => `
      <div class="chat-message">
        <span class="chat-sender">${esc(message.senderName || "Player")}</span>
        <span class="chat-content">${esc(message.content)}</span>
      </div>
    `).join("")
    : `<p class="hint">No chat yet.</p>`;
  container.scrollTop = container.scrollHeight;
}

function wireChatControls() {
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");
  if (!chatInput || !sendChatBtn) return;

  const sendChat = () => {
    const content = chatInput.value.trim();
    if (!content) return;
    socket.emit("sendChatMessage", { content });
    chatInput.value = "";
  };

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChat();
    }
  });

  sendChatBtn.addEventListener("click", sendChat);
}

function renderMatchScreen(message, lightClass) {
  root.innerHTML = `
    <div class="arena-solo">
      <div class="center-overlay visible">
        <span class="${lightClass.includes("green") ? "go-text" : "wait-text"}">${message}</span>
      </div>
      <div class="player-panel-solo">
        <div class="light-circle ${lightClass}"></div>
      </div>
      <div class="solo-feedback"></div>
    </div>
  `;
}

function renderPostMatchScreen(state) {
  const currentPlayer = state.players.find((player) => player.id === myPlayerId);
  const waitingText = state.waitingFor?.length ? `Waiting for: ${state.waitingFor.join(", ")}` : "Everyone is back in the lobby.";

  root.innerHTML = `
    <div class="game-over">
      <h1 class="winner-banner">Room ${esc(state.room)}</h1>
      <p class="hint">${esc(waitingText)}</p>
      <p class="hint">Rounds: ${state.totalRounds}</p>
      <div class="chat-panel">
        <div id="chatMessages" class="chat-messages"></div>
        <div class="input-row">
          <input id="chatInput" type="text" placeholder="Send a message" maxlength="${CHAT_LIMIT}" autocomplete="off" />
          <button id="sendChatBtn" class="btn btn-secondary">Send</button>
        </div>
      </div>
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
  selectedKey = key;
  if (roomState && (roomState.status === "waiting_for_players" || roomState.status === "ready_check")) {
    renderLobby(roomState);
  }
});

socket.on("playerList", ({ players }) => {
  roomState = roomState || { players: [] };
  roomState.players = players;
  renderRoster(players);

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
  <div class="game-over">
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
        <div class="chat-panel">
          <div id="chatMessages" class="chat-messages"></div>
          <div class="input-row">
            <input id="chatInput" type="text" placeholder="Send a message" maxlength="${CHAT_LIMIT}" autocomplete="off" />
            <button id="sendChatBtn" class="btn btn-secondary">Send</button>
          </div>
        </div>
        ${isHost ? '<button id="nextRoundBtn" class="btn btn-primary btn-big">Next Round</button>' : '<p class="hint">Waiting for host…</p>'}
      </div>
    </div>
  `;

  if (isHost) {
    document.getElementById("nextRoundBtn").addEventListener("click", () => socket.emit("nextRound"));
  }
  wireChatControls();
  renderChat(roomState?.chatMessages || []);
});

socket.on("gameOver", ({ standings }) => {
  root.innerHTML = `
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
  `;

  document.getElementById("returnLobbyBtn").addEventListener("click", () => socket.emit("requestLobbyView"));
  if (isHost) {
    document.getElementById("playAgainBtn").addEventListener("click", () => socket.emit("playAgain"));
  }
  wireChatControls();
  renderChat(roomState?.chatMessages || []);
});

socket.on("roomClosed", ({ reason }) => {
  myPlayerId = null;
  isHost = false;
  roomState = null;
  selectedKey = null;
  if (reason === "left" || reason === "host_closed") {
    localStorage.removeItem(ROOM_CODE_KEY);
    localStorage.removeItem(PLAYER_NAME_KEY);
    localStorage.removeItem(HOST_RECLAIM_KEY);
    savedRoomCode = "";
    savedPlayerName = "";
    hostReclaimToken = "";
  }
  renderJoinScreen();
});

socket.on("error", ({ message }) => {
  showPageNotification(message, "error");
});

const handleKeyDown = (e) => {
  const active = document.activeElement;
  if (active && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName)) {
    return;
  }

  if (roomState && (roomState.status === "waiting_for_players" || roomState.status === "ready_check") && selectedKey) {
    if (e.key.toLowerCase() === selectedKey) {
      e.preventDefault();
      socket.emit("toggleReady");
    }
    return;
  }

  if (!roomState || (roomState.status !== "countdown" && roomState.status !== "waiting" && roomState.status !== "react")) return;

  if (selectedKey && e.key.toLowerCase() === selectedKey) {
    e.preventDefault();
    socket.emit("playerInput");
  }
};

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
