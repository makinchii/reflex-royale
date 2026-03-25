/**
 * remote.js — Entry point for separate-device multiplayer mode.
 *
 * Each player opens the page on their own device/tab.
 * Communication happens over Socket.IO through the Express server.
 *
 * The first player to connect becomes the "host" and can start the game.
 * All game logic runs on the server (via a server-side GameEngine instance).
 * This client just renders state updates and sends input events.
 */

const socket = io();

/* ── DOM references ── */
const root           = document.getElementById("game-root");
let myPlayerId       = null;
let isHost           = false;

/* ── Initial join screen ── */
renderJoinScreen();

function renderJoinScreen() {
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
      <div id="remotePlayerSlots" class="player-slots"></div>
      <button id="startGameBtn" class="btn btn-big btn-go" style="display:none">Start Game</button>
    </div>
  `;

  document.getElementById("createRoomBtn").addEventListener("click", () => {
    const name = document.getElementById("playerName").value.trim();
    if (!name) return alert("Enter your name first.");
    socket.emit("createRoom", { name });
  });

  document.getElementById("joinBtn").addEventListener("click", () => {
    const name = document.getElementById("playerName").value.trim();
    const room = document.getElementById("roomCode").value.trim().toUpperCase();
    if (!name || !room) return alert("Enter both name and room code.");
    socket.emit("joinRoom", { name, room });
  });
}

/* ── Socket events ── */

socket.on("roomCreated", ({ room, playerId }) => {
  myPlayerId = playerId;
  isHost = true;
  document.getElementById("roomCode").value = room;
  document.getElementById("roomCode").readOnly = true;
  document.getElementById("createRoomBtn").style.display = "none";
  document.getElementById("joinBtn").style.display = "none";
  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) startBtn.style.display = "block";

  startBtn.addEventListener("click", () => {
    socket.emit("startGame", { room });
  });
});

socket.on("roomJoined", ({ room, playerId }) => {
  myPlayerId = playerId;
  document.getElementById("roomCode").value = room;
  document.getElementById("roomCode").readOnly = true;
  document.getElementById("createRoomBtn").style.display = "none";
  document.getElementById("joinBtn").style.display = "none";
});

socket.on("playerList", ({ players }) => {
  const container = document.getElementById("remotePlayerSlots");
  if (!container) return;
  container.innerHTML = players.map((p, i) => `
    <div class="player-slot" style="border-color:${p.color}">
      <span class="player-slot-name" style="color:${p.color}">${esc(p.name)}</span>
      ${p.id === myPlayerId ? '<span class="you-tag">YOU</span>' : ''}
    </div>
  `).join("");
});

socket.on("countdown", ({ remaining }) => {
  root.innerHTML = `
    <div class="arena-solo">
      <div class="center-overlay visible">
        <span class="countdown-num">${remaining}</span>
      </div>
      <div class="player-panel-solo">
        <div class="light-circle off"></div>
      </div>
    </div>
  `;
});

socket.on("waiting", () => {
  renderSoloArena("red", "Wait for it…");
});

socket.on("react", () => {
  renderSoloArena("green", "GO!");
});

socket.on("falseStart", ({ id }) => {
  if (id === myPlayerId) {
    renderSoloArena("red flash", "Too early!");
  }
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
            <li class="${i === 0 && r.time !== Infinity ? 'winner' : ''}${r.id === myPlayerId ? ' you' : ''}">
              <span class="result-name">${esc(r.name)}</span>
              <span class="result-time">${
                r.falseStart ? "False start!" :
                r.missed ? "Missed!" :
                r.time + " ms"
              }</span>
              <span class="result-points">${r.points ? "+" + r.points : "—"}</span>
            </li>
          `).join("")}
        </ol>
        ${isHost ? '<button id="nextRoundBtn" class="btn btn-primary btn-big">Next Round</button>' : '<p class="hint">Waiting for host…</p>'}
      </div>
    </div>
  `;

  if (isHost) {
    document.getElementById("nextRoundBtn").addEventListener("click", () => {
      socket.emit("nextRound");
    });
  }
});

socket.on("gameOver", ({ standings, roundHistory }) => {
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
        ${isHost ? '<button id="playAgainBtn" class="btn btn-primary btn-big">Play Again</button>' : '<p class="hint">Waiting for host…</p>'}
      </div>
    </div>
  `;

  if (isHost) {
    document.getElementById("playAgainBtn").addEventListener("click", () => {
      socket.emit("playAgain");
    });
  }
});

socket.on("backToLobby", () => {
  renderJoinScreen();
});

socket.on("error", ({ message }) => {
  alert(message);
});

/* ── Input handling: press any key or tap the screen ── */

document.addEventListener("keydown", (e) => {
  e.preventDefault();
  socket.emit("playerInput");
});

document.addEventListener("touchstart", (e) => {
  // Prevent double-tap zoom
  if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
  socket.emit("playerInput");
});

/* ── Helper ── */

function renderSoloArena(lightClass, label) {
  root.innerHTML = `
    <div class="arena-solo">
      <div class="center-overlay visible">
        <span class="${lightClass.includes('green') ? 'go-text' : 'wait-text'}">${label}</span>
      </div>
      <div class="player-panel-solo">
        <div class="light-circle ${lightClass}"></div>
      </div>
      <div class="solo-feedback"></div>
    </div>
  `;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
