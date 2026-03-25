/**
 * gameRoom.js — Server-side Socket.IO handler for separate-device mode.
 *
 * Each "room" holds its own mini game engine that runs the countdown,
 * random delay, and reaction timing on the server so that no client
 * can cheat by manipulating local timers.
 */

const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];

/** Lightweight server-side game state per room */
class RoomGame {
  constructor(roomCode) {
    this.roomCode    = roomCode;
    this.players     = new Map();   // socketId → { id, name, color, … }
    this.hostId      = null;
    this.state       = "lobby";     // lobby | countdown | waiting | react | roundEnd | gameOver
    this.currentRound = 0;
    this.totalRounds  = 5;
    this.roundHistory = [];
    this._reactStart  = null;
    this._timers      = [];
  }

  addPlayer(socketId, name) {
    if (this.players.size >= 4) return null;
    const color = PLAYER_COLORS[this.players.size] || "#888";
    const player = {
      id: socketId,
      name,
      color,
      totalScore: 0,
      roundTimes: [],
      wins: 0,
      falseStarts: 0,
      bestTime: Infinity,
      avgTime: 0,
      _pressed: false,
      _reactionTime: null,
      _falseStart: false,
    };
    this.players.set(socketId, player);
    if (!this.hostId) this.hostId = socketId;
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.hostId === socketId) {
      this.hostId = this.players.keys().next().value || null;
    }
  }

  getPlayerList() {
    return [...this.players.values()].map(p => ({
      id: p.id, name: p.name, color: p.color,
    }));
  }

  getStandings() {
    return [...this.players.values()]
      .map(p => ({
        id: p.id, name: p.name, color: p.color,
        totalScore: p.totalScore, wins: p.wins,
        bestTime: p.bestTime === Infinity ? null : p.bestTime,
        avgTime: p.avgTime || null, falseStarts: p.falseStarts,
        roundTimes: p.roundTimes.map(t => t === Infinity ? null : t),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  clearTimers() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers = [];
  }

  resetRoundState() {
    for (const p of this.players.values()) {
      p._pressed = false;
      p._reactionTime = null;
      p._falseStart = false;
    }
  }

  resetForNewGame() {
    for (const p of this.players.values()) {
      p.totalScore = 0;
      p.roundTimes = [];
      p.wins = 0;
      p.falseStarts = 0;
      p.bestTime = Infinity;
      p.avgTime = 0;
    }
    this.currentRound = 0;
    this.roundHistory = [];
    this.clearTimers();
  }
}

/** Active rooms in memory */
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

/**
 * Attach Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
function initGameSockets(io) {
  io.on("connection", (socket) => {
    let currentRoom = null;

    socket.on("createRoom", ({ name }) => {
      const code = generateRoomCode();
      const room = new RoomGame(code);
      rooms.set(code, room);
      room.addPlayer(socket.id, name);
      currentRoom = code;
      socket.join(code);
      socket.emit("roomCreated", { room: code, playerId: socket.id });
      io.to(code).emit("playerList", { players: room.getPlayerList() });
    });

    socket.on("joinRoom", ({ name, room: code }) => {
      const room = rooms.get(code);
      if (!room) return socket.emit("error", { message: "Room not found." });
      if (room.state !== "lobby") return socket.emit("error", { message: "Game already in progress." });
      if (room.players.size >= 4) return socket.emit("error", { message: "Room is full." });

      room.addPlayer(socket.id, name);
      currentRoom = code;
      socket.join(code);
      socket.emit("roomJoined", { room: code, playerId: socket.id });
      io.to(code).emit("playerList", { players: room.getPlayerList() });
    });

    socket.on("startGame", () => {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.players.size < 2) return socket.emit("error", { message: "Need at least 2 players." });

      room.resetForNewGame();
      startNextRound(io, room);
    });

    socket.on("playerInput", () => {
      const room = rooms.get(currentRoom);
      if (!room) return;
      const p = room.players.get(socket.id);
      if (!p || p._pressed) return;

      p._pressed = true;

      if (room.state === "waiting") {
        p._falseStart = true;
        p.falseStarts++;
        p._reactionTime = 500;
        io.to(currentRoom).emit("falseStart", { id: socket.id });
        return;
      }

      if (room.state === "react") {
        p._reactionTime = Math.round(performance.now() - room._reactStart);
        io.to(currentRoom).emit("playerReacted", { id: socket.id, time: p._reactionTime });

        const allPressed = [...room.players.values()].every(pl => pl._pressed);
        if (allPressed) {
          room.clearTimers();
          endRound(io, room);
        }
      }
    });

    socket.on("nextRound", () => {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.state !== "roundEnd") return;
      startNextRound(io, room);
    });

    socket.on("playAgain", () => {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      room.resetForNewGame();
      startNextRound(io, room);
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      room.removePlayer(socket.id);
      if (room.players.size === 0) {
        room.clearTimers();
        rooms.delete(currentRoom);
      } else {
        io.to(currentRoom).emit("playerList", { players: room.getPlayerList() });
      }
    });
  });
}

/* ── Round flow helpers ── */

function startNextRound(io, room) {
  room.currentRound++;
  if (room.currentRound > room.totalRounds) {
    endGame(io, room);
    return;
  }

  room.resetRoundState();
  room.state = "countdown";

  let remaining = 3;
  io.to(room.roomCode).emit("countdown", { remaining });

  const tick = () => {
    remaining--;
    if (remaining <= 0) {
      startWaiting(io, room);
    } else {
      io.to(room.roomCode).emit("countdown", { remaining });
      room._timers.push(setTimeout(tick, 1000));
    }
  };
  room._timers.push(setTimeout(tick, 1000));
}

function startWaiting(io, room) {
  room.state = "waiting";
  io.to(room.roomCode).emit("waiting", {});

  const delay = 1000 + Math.random() * 4000;
  room._timers.push(setTimeout(() => {
    room.state = "react";
    room._reactStart = performance.now();
    io.to(room.roomCode).emit("react", {});

    // Auto-end after 2s
    room._timers.push(setTimeout(() => {
      if (room.state === "react") endRound(io, room);
    }, 2000));
  }, delay));
}

function endRound(io, room) {
  room.state = "roundEnd";
  const results = [];
  for (const p of room.players.values()) {
    const time = p._falseStart ? Infinity : (p._reactionTime ?? Infinity);
    p.roundTimes.push(time);
    results.push({
      id: p.id, name: p.name, time,
      falseStart: p._falseStart,
      missed: !p._pressed && !p._falseStart,
    });
  }

  results.sort((a, b) => a.time - b.time);
  const count = room.players.size;
  let rank = 0;
  for (const r of results) {
    r.points = r.time === Infinity ? 0 : count - rank++;
    const p = room.players.get(r.id);
    p.totalScore += r.points;
    if (r.points === count) p.wins++;
    if (r.time < p.bestTime) p.bestTime = r.time;
  }

  for (const p of room.players.values()) {
    const valid = p.roundTimes.filter(t => t < Infinity);
    p.avgTime = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }

  room.roundHistory.push({ roundNum: room.currentRound, results });
  io.to(room.roomCode).emit("roundEnd", { roundNum: room.currentRound, results });
}

function endGame(io, room) {
  room.state = "gameOver";
  io.to(room.roomCode).emit("gameOver", {
    standings: room.getStandings(),
    roundHistory: room.roundHistory,
  });
}

module.exports = { initGameSockets };
