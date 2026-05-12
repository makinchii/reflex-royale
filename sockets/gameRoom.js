/**
 * gameRoom.js - Server-side Socket.IO handler for online lobby play.
 *
 * The server owns room state, lobby readiness, timing, and scoring.
 * Clients only join, ready up, start, and send input events.
 */

const crypto = require("crypto");
const { performance } = require("perf_hooks");
const { normalizeGameKey } = require("../lib/gameKeys.cjs");
const { THEME_COMMAND_COLORS, isAllowedThemeColor, normalizeThemeCommand } = require("../lib/themePreferences.js");

const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
const STALE_SLOT_MS = 60_000;
const MATCH_TRANSITION_DURATION_MS = 3000;
const MATCH_PLAYER_SPLASH_DURATION_MS = 2800;

const ROOM_STATUS = Object.freeze({
  WAITING_FOR_PLAYERS: "waiting_for_players",
  READY_CHECK: "ready_check",
  STARTING: "starting",
  COUNTDOWN: "countdown",
  WAITING: "waiting",
  REACT: "react",
  ROUND_END: "roundEnd",
  POST_MATCH: "post_match",
  GAME_OVER: "gameOver",
  CLOSED: "closed"
});

class RoomGame {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.players = new Map();
    this.hostId = null;
    this.hostReclaimToken = crypto.randomUUID();
    this.blacklistedNames = new Set();
    this.blacklistedVerifiers = new Set();
    this.status = ROOM_STATUS.WAITING_FOR_PLAYERS;
    this.currentRound = 0;
    this.totalRounds = 5;
    this.targetScore = 10;
    this.roundHistory = [];
    this.chatMessages = [];
    this._reactStart = null;
    this._timers = [];
    this._staleSweep = setInterval(() => this._pruneStalePlayers(), 15_000);
  }

  addPlayer(socketId, name, verifier, originalHost = false) {
    if (this.status === ROOM_STATUS.CLOSED || this.status === ROOM_STATUS.STARTING || this.status === ROOM_STATUS.COUNTDOWN || this.status === ROOM_STATUS.WAITING || this.status === ROOM_STATUS.REACT) {
      return null;
    }

    if (this.players.size >= 4) return null;

    if (this.blacklistedNames.has(name) || this.blacklistedVerifiers.has(verifier)) {
      return null;
    }

    const existing = this.players.get(socketId);
    if (existing) {
      existing.connected = true;
      existing.name = name;
      existing.verifier = verifier;
      existing.lastSeenAt = Date.now();
      existing.isInLobbyView = true;
      this._syncHostFlags();
      this._refreshLobbyStatus();
      return existing;
    }

    const color = PLAYER_COLORS[this.players.size] || "#888";
    const player = {
      id: socketId,
      name,
      verifier,
      color,
      themeCommand: null,
      connected: true,
      keyBinding: null,
      isReady: false,
      isHost: false,
      originalHost,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      isInLobbyView: true,
      totalScore: 0,
      roundTimes: [],
      wins: 0,
      falseStarts: 0,
      bestTime: Infinity,
      avgTime: 0,
      _pressed: false,
      _reactionTime: null,
      _falseStart: false,
      _disconnected: false
    };

    this.players.set(socketId, player);

    if (!this.hostId) {
      this.hostId = socketId;
    }

    this._syncHostFlags();
    this._refreshLobbyStatus();
    return player;
  }

  reclaimPlayer(socketId, name, verifier) {
    const existing = [...this.players.values()].find((player) => player.name === name && player.verifier === verifier);
    if (!existing) {
      const conflicting = [...this.players.values()].find((player) => player.name === name && player.verifier !== verifier);
      if (conflicting) {
        return { ok: false, message: "That name is already in use by another player in this room." };
      }

      return { ok: false, message: "No saved slot matches that player." };
    }

    // Allow the same browser identity to reclaim the slot during refresh even if
    // the old socket has not finished disconnecting yet.

    this.players.delete(existing.id);
    existing.id = socketId;
    existing.connected = true;
    existing.isInLobbyView = true;
    existing.lastSeenAt = Date.now();
    this.players.set(socketId, existing);

    if (!this.hostId) {
      this.hostId = socketId;
    }

    this._syncHostFlags();
    this._refreshLobbyStatus();
    return { ok: true, player: existing, reclaimed: true };
  }

  reclaimHost(socketId, token) {
    if (!token || token !== this.hostReclaimToken) {
      return { ok: false, message: "Host reclaim token is invalid." };
    }

    const existing = [...this.players.values()].find((player) => player.originalHost);
    if (!existing) {
      return { ok: false, message: "No host slot is available to reclaim." };
    }

    this.players.delete(existing.id);
    existing.id = socketId;
    existing.connected = true;
    existing.isInLobbyView = true;
    existing.lastSeenAt = Date.now();
    this.players.set(socketId, existing);

    if (!this.hostId) {
      this.hostId = socketId;
    }
    this._syncHostFlags();
    this._refreshLobbyStatus();
    return { ok: true, player: existing, reclaimed: true, hostReclaimToken: this.hostReclaimToken };
  }

  hasPlayerName(name) {
    return [...this.players.values()].some((player) => player.name === name);
  }

  isBlacklisted(name, verifier) {
    return this.blacklistedNames.has(name) || this.blacklistedVerifiers.has(verifier);
  }

  blacklistPlayer(player) {
    if (!player) return;

    this.blacklistedNames.add(player.name);
    this.blacklistedVerifiers.add(player.verifier);
  }

  findMatchingPlayer(name, verifier) {
    return [...this.players.values()].find((player) => player.name === name && player.verifier === verifier) || null;
  }

  toggleReady(socketId) {
    if (!this._isLobbyState()) return false;

    const player = this.players.get(socketId);
    if (!player || !player.connected) return false;
    if (!player.keyBinding) return false;

    player.isReady = !player.isReady;
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ready: player.isReady };
  }

  bindKey(socketId, key) {
    if (!this._isLobbyState()) {
      return { ok: false, message: "Keys can only be changed in the lobby." };
    }

    const player = this.players.get(socketId);
    if (!player || !player.connected) {
      return { ok: false, message: "Player not found." };
    }

    const normalized = normalizeGameKey(String(key || "").trim());
    if (!normalized) {
      return { ok: false, message: "Pick a displayed keyboard key." };
    }

    for (const other of this.players.values()) {
      if (other.id !== socketId && other.keyBinding === normalized) {
        return { ok: false, message: "That key is already in use." };
      }
    }

    player.keyBinding = normalized;
    player.isReady = false;
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ok: true, key: normalized };
  }

  assignPreferredKey(socketId, key) {
    const player = this.players.get(socketId);
    if (!player || !player.connected || player.keyBinding) return { ok: false };

    const normalized = normalizeGameKey(String(key || "").trim());
    if (!normalized) return { ok: false };

    for (const other of this.players.values()) {
      if (other.id !== socketId && other.keyBinding === normalized) return { ok: false };
    }

    player.keyBinding = normalized;
    player.isReady = false;
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ok: true, key: normalized };
  }

  assignPreferredTheme(socketId, command, color) {
    const player = this.players.get(socketId);
    if (!player || !player.connected || player.themeCommand) return { ok: false };

    const themeCommand = normalizeThemeCommand(command);
    for (const other of this.players.values()) {
      if (other.id !== socketId && other.themeCommand === themeCommand) return { ok: false };
    }

    player.themeCommand = themeCommand;
    player.color = isAllowedThemeColor(themeCommand, color) ? color : THEME_COMMAND_COLORS[themeCommand];
    player.isReady = false;
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ok: true, themeCommand, color: player.color };
  }

  bindTheme(socketId, command, color) {
    if (!this._isLobbyState()) {
      return { ok: false, message: "Sigils can only be changed in the lobby." };
    }

    const player = this.players.get(socketId);
    if (!player || !player.connected) {
      return { ok: false, message: "Player not found." };
    }

    const themeCommand = normalizeThemeCommand(command);
    for (const other of this.players.values()) {
      if (other.id !== socketId && other.themeCommand === themeCommand) {
        return { ok: false, message: "That Chroma Sigil is already claimed." };
      }
    }

    player.themeCommand = themeCommand;
    player.color = isAllowedThemeColor(themeCommand, color) ? color : THEME_COMMAND_COLORS[themeCommand];
    player.isReady = false;
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ok: true, themeCommand, color: player.color };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false };

    this.players.delete(socketId);
    if (this.hostId === socketId) {
      this._reassignHost();
    }
    this._refreshLobbyStatus();
    return { ok: true, player };
  }

  returnToLobby(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false };

    player.isInLobbyView = true;
    player.lastSeenAt = Date.now();
    if (this.status === ROOM_STATUS.ROUND_END || this.status === ROOM_STATUS.GAME_OVER) {
      this.status = ROOM_STATUS.POST_MATCH;
    }
    this._refreshLobbyStatus();
    return { ok: true };
  }

  setLobbyView(socketId, inLobbyView) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false };

    player.isInLobbyView = Boolean(inLobbyView);
    player.lastSeenAt = Date.now();
    this._refreshLobbyStatus();
    return { ok: true };
  }

  addChatMessage(socketId, content) {
    const player = this.players.get(socketId);
    if (!player || !player.connected) {
      return { ok: false, message: "Player not found." };
    }

    const normalized = String(content || "").trim();
    if (!normalized) {
      return { ok: false, message: "Message cannot be empty." };
    }

    if (normalized.length > 250) {
      return { ok: false, message: "Messages must be 250 characters or fewer." };
    }

    if (!this._canChat()) {
      return { ok: false, message: "Chat is only available in the lobby and between rounds." };
    }

    const message = {
      id: crypto.randomUUID(),
      lobbyId: this.roomCode,
      senderPlayerId: player.id,
      senderName: player.name,
      content: normalized,
      createdAt: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 50) {
      this.chatMessages = this.chatMessages.slice(-50);
    }

    return { ok: true, message };
  }

  addSystemChatMessage(player, content) {
    if (!player) return null;

    const message = {
      id: crypto.randomUUID(),
      lobbyId: this.roomCode,
      senderPlayerId: player.id,
      senderName: player.name,
      senderColor: player.color,
      content,
      system: true,
      createdAt: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 50) {
      this.chatMessages = this.chatMessages.slice(-50);
    }

    return message;
  }

  canStart() {
    const activePlayers = this._connectedPlayers();
    return activePlayers.length >= 2 && activePlayers.every((player) => player.isReady);
  }

  beginMatch() {
    if (!this.canStart()) return false;

    this._clearTimers();
    this.currentRound = 0;
    this.roundHistory = [];
    this.status = ROOM_STATUS.STARTING;

    for (const player of this.players.values()) {
      player.totalScore = 0;
      player.roundTimes = [];
      player.wins = 0;
      player.falseStarts = 0;
      player.bestTime = Infinity;
      player.avgTime = 0;
      player.isReady = false;
      player._pressed = false;
      player._reactionTime = null;
      player._falseStart = false;
      player._disconnected = !player.connected;
      player.isInLobbyView = false;
    }

    return true;
  }

  resetForReplay() {
    this._clearTimers();
    this.currentRound = 0;
    this.roundHistory = [];
    this.status = ROOM_STATUS.WAITING_FOR_PLAYERS;

    for (const player of this.players.values()) {
      player.isReady = false;
      player.isInLobbyView = false;
      player.lastSeenAt = Date.now();
    }

    this._refreshLobbyStatus();
  }

  pruneDisconnectedPlayers() {
    for (const [id, player] of this.players.entries()) {
      if (!player.connected) {
        this.players.delete(id);
      }
    }

    if (!this.players.has(this.hostId)) {
      this.hostId = this._connectedPlayers()[0]?.id || null;
    }

    this._syncHostFlags();
  }

  _pruneStalePlayers() {
    const now = Date.now();
    let changed = false;

    for (const [id, player] of this.players.entries()) {
      if (!player.connected && now - player.lastSeenAt > STALE_SLOT_MS) {
        this.players.delete(id);
        changed = true;
      }
    }

    if (changed) {
      if (this.hostId && !this.players.has(this.hostId)) {
        this._reassignHost();
      }
      this._refreshLobbyStatus();
    }
  }

  markDisconnected(socketId) {
    const player = this.players.get(socketId);
    if (!player) {
      return { changed: false, closed: false, endMatch: false };
    }

    if (this._isLobbyState()) {
      player.connected = false;
      player.isReady = false;
      player.isInLobbyView = false;
      player.lastSeenAt = Date.now();
      if (this.hostId === socketId) {
        this._reassignHost();
      }
      this._refreshLobbyStatus();

      return {
        changed: true,
        closed: false,
        endMatch: false
      };
    }

    player.connected = false;
    player.isReady = false;
    player._disconnected = true;

    if (this.hostId === socketId) {
      this._reassignHost();
    }

    const activePlayers = this._connectedPlayers();
    const shouldEndMatch = [ROOM_STATUS.STARTING, ROOM_STATUS.COUNTDOWN, ROOM_STATUS.WAITING, ROOM_STATUS.REACT].includes(this.status) && activePlayers.length < 2;

    return {
      changed: true,
      closed: false,
      endMatch: shouldEndMatch
    };
  }

  getPlayerList() {
    return this.getRoster();
  }

  getRoster() {
    return [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        themeCommand: player.themeCommand,
        connected: player.connected,
        isReady: player.isReady,
        isHost: player.isHost,
        keySet: Boolean(player.keyBinding),
        hasKeyBinding: Boolean(player.keyBinding),
        keyBinding: player.keyBinding,
        isInLobbyView: player.isInLobbyView,
        lastSeenAt: player.lastSeenAt,
        joinedAt: player.joinedAt
      }));
  }

  getStandings() {
    return [...this.players.values()]
      .map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        themeCommand: player.themeCommand,
        totalScore: player.totalScore,
        wins: player.wins,
        bestTime: player.bestTime === Infinity ? null : player.bestTime,
        avgTime: player.avgTime || null,
        falseStarts: player.falseStarts,
        roundTimes: player.roundTimes.map((time) => (time === Infinity ? null : time))
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.wins !== a.wins) return b.wins - a.wins;
        const aBest = a.bestTime ?? Infinity;
        const bBest = b.bestTime ?? Infinity;
        if (aBest !== bBest) return aBest - bBest;
        return a.name.localeCompare(b.name);
      });
  }

  getRoomState() {
    const players = this.getRoster();
    return {
      room: this.roomCode,
      status: this.status,
      hostId: this.hostId,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      targetScore: this.targetScore,
      canStart: this.canStart(),
      playerCount: players.length,
      readyCount: players.filter((player) => player.isReady && player.connected).length,
      waitingFor: this.getWaitingList(),
      standings: this.getStandings(),
      roundHistory: this.roundHistory,
      chatMessages: this.chatMessages,
      players
    };
  }

  getHostReclaimToken() {
    return this.hostReclaimToken;
  }

  _isLobbyState() {
    return this.status === ROOM_STATUS.WAITING_FOR_PLAYERS || this.status === ROOM_STATUS.READY_CHECK;
  }

  _connectedPlayers() {
    return [...this.players.values()].filter((player) => player.connected);
  }

  _allConnectedReady() {
    const players = this._connectedPlayers();
    return players.length >= 2 && players.every((player) => player.isReady && player.keyBinding);
  }

  _refreshLobbyStatus() {
    if (this.status === ROOM_STATUS.POST_MATCH) {
      if (this._allConnectedInLobbyView()) {
        this.status = this._allConnectedReady() ? ROOM_STATUS.READY_CHECK : ROOM_STATUS.WAITING_FOR_PLAYERS;
        return;
      }

      if (this._connectedPlayers().length === 1) {
        // Keep the remaining player on the post-match screen until they leave or return.
        return;
      }

      return;
    }

    if (!this._isLobbyState() && this.status !== ROOM_STATUS.WAITING_FOR_PLAYERS) return;
    this.status = this._allConnectedReady() ? ROOM_STATUS.READY_CHECK : ROOM_STATUS.WAITING_FOR_PLAYERS;
  }

  _allConnectedInLobbyView() {
    const players = this._connectedPlayers();
    return players.length >= 2 && players.every((player) => player.isInLobbyView);
  }

  _canChat() {
    return this._isLobbyState() || this.status === ROOM_STATUS.ROUND_END || this.status === ROOM_STATUS.POST_MATCH || this.status === ROOM_STATUS.GAME_OVER;
  }

  getWaitingList() {
    return [...this.players.values()]
      .filter((player) => !player.isInLobbyView)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((player) => player.name);
  }

  setRoundCount(socketId, value) {
    if (socketId !== this.hostId) {
      return { ok: false, message: "Only the host can change round count." };
    }

    if (!this._isLobbyState()) {
      return { ok: false, message: "Round count can only be changed in the lobby." };
    }

    const roundCount = Number.parseInt(value, 10);
    if (!Number.isFinite(roundCount) || roundCount < 1 || roundCount > 20) {
      return { ok: false, message: "Round count must be between 1 and 20." };
    }

    this.totalRounds = roundCount;
    const player = this.players.get(socketId);
    if (player) {
      player.lastSeenAt = Date.now();
    }
    this._refreshLobbyStatus();
    return { ok: true, totalRounds: this.totalRounds };
  }

  _syncHostFlags() {
    for (const player of this.players.values()) {
      player.isHost = player.id === this.hostId;
    }
  }

  _reassignHost() {
    const nextHost = this._connectedPlayers().sort((a, b) => a.joinedAt - b.joinedAt)[0] || null;
    this.hostId = nextHost ? nextHost.id : null;
    this._syncHostFlags();
  }

  _clearTimers() {
    for (const timer of this._timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this._timers = [];
  }

  _clearStaleSweep() {
    if (this._staleSweep) {
      clearInterval(this._staleSweep);
      this._staleSweep = null;
    }
  }

  _schedule(timer) {
    this._timers.push(timer);
    return timer;
  }

  _resetRoundState() {
    for (const player of this.players.values()) {
      player._pressed = false;
      player._reactionTime = null;
      player._falseStart = false;
      player._disconnected = !player.connected;
    }
  }
}

const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  return rooms.has(code) ? generateRoomCode() : code;
}

function emitRoomState(io, room) {
  io.to(room.roomCode).emit("roomState", room.getRoomState());
  io.to(room.roomCode).emit("playerList", { players: room.getRoster() });
}

function emitChatMessages(io, room, message = null) {
  io.to(room.roomCode).emit("chatMessage", {
    message,
    messages: room.chatMessages
  });
}

function closeRoom(io, room, reason = "closed") {
  room._clearTimers();
  room._clearStaleSweep();
  room.status = ROOM_STATUS.CLOSED;
  io.to(room.roomCode).emit("roomClosed", { room: room.roomCode, reason });
  rooms.delete(room.roomCode);
}

function applyPreferredPlayerOptions(room, socketId, { preferredKey, preferredThemeCommand, preferredThemeColor } = {}) {
  const unavailable = [];
  if (preferredKey && !room.assignPreferredKey(socketId, preferredKey).ok) unavailable.push("key");
  if (preferredThemeCommand && !room.assignPreferredTheme(socketId, preferredThemeCommand, preferredThemeColor).ok) unavailable.push("theme");
  return unavailable;
}

function getTransitionPlayers(room) {
  return room.getRoster().map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    themeCommand: player.themeCommand,
    key: player.keyBinding
  }));
}

function startNextRound(io, room) {
  room.currentRound += 1;

  if (room.currentRound > room.totalRounds || room.getStandings()[0]?.totalScore >= room.targetScore) {
    endGame(io, room);
    return;
  }

  room._clearTimers();
  room._resetRoundState();
  room.status = ROOM_STATUS.COUNTDOWN;
  emitRoomState(io, room);

  let remaining = 3;
  io.to(room.roomCode).emit("countdown", { remaining });

  const tick = () => {
    remaining -= 1;
    if (remaining <= 0) {
      startWaiting(io, room);
    } else {
      io.to(room.roomCode).emit("countdown", { remaining });
      room._schedule(setTimeout(tick, 1000));
    }
  };

  room._schedule(setTimeout(tick, 1000));
}

function startWaiting(io, room) {
  room.status = ROOM_STATUS.WAITING;
  emitRoomState(io, room);
  io.to(room.roomCode).emit("waiting", {});

  const delay = 1000 + Math.random() * 4000;
  room._schedule(setTimeout(() => {
    room.status = ROOM_STATUS.REACT;
    room._reactStart = performance.now();
    emitRoomState(io, room);
    io.to(room.roomCode).emit("react", {});

    room._schedule(setTimeout(() => {
      if (room.status === ROOM_STATUS.REACT) {
        endRound(io, room);
      }
    }, 2000));
  }, delay));
}

function endRound(io, room) {
  room.status = ROOM_STATUS.ROUND_END;

  const results = [];

  for (const player of room.players.values()) {
    let outcome = "valid";
    let time = null;

    if (!player.connected) {
      outcome = "disconnected";
    } else if (player._falseStart) {
      outcome = "false_start";
    } else if (player._reactionTime === null) {
      outcome = "timeout";
    } else {
      time = player._reactionTime;
    }

    if (outcome === "valid") {
      player.roundTimes.push(time);
    } else {
      player.roundTimes.push(Infinity);
    }

    results.push({
      id: player.id,
      name: player.name,
      time: outcome === "valid" ? time : Infinity,
      falseStart: outcome === "false_start",
      missed: outcome === "timeout",
      disconnected: outcome === "disconnected",
      outcome,
      points: 0
    });
  }

  results.sort((a, b) => {
    const weight = (result) => {
      if (result.outcome === "valid") return 0;
      if (result.outcome === "false_start") return 1;
      if (result.outcome === "timeout") return 2;
      return 3;
    };

    const diff = weight(a) - weight(b);
    if (diff !== 0) return diff;
    if (a.outcome === "valid" && b.outcome === "valid") return a.time - b.time;
    return a.name.localeCompare(b.name);
  });

  const scoringPlayers = results.filter((result) => result.outcome === "valid");
  const playerCount = room.players.size;

  scoringPlayers.forEach((result, index) => {
    result.points = playerCount - index;
    const player = room.players.get(result.id);
    if (player) {
      player.totalScore += result.points;
      player.wins += index === 0 ? 1 : 0;
      if (result.time < player.bestTime) player.bestTime = result.time;
    }
  });

  for (const player of room.players.values()) {
    const validTimes = player.roundTimes.filter((time) => time < Infinity);
    player.avgTime = validTimes.length ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 0;
  }

  const roundData = { roundNum: room.currentRound, results };
  room.roundHistory.push(roundData);
  emitRoomState(io, room);
  io.to(room.roomCode).emit("roundEnd", roundData);
}

function endGame(io, room) {
  room._clearTimers();
  room.status = ROOM_STATUS.POST_MATCH;
  emitRoomState(io, room);
  io.to(room.roomCode).emit("gameOver", {
    standings: room.getStandings(),
    roundHistory: room.roundHistory
  });
}

function initGameSockets(io) {
  io.on("connection", (socket) => {
    let currentRoom = null;

    socket.on("createRoom", ({ name, totalRounds, preferredKey, preferredThemeCommand, preferredThemeColor }) => {
      if (!name?.trim()) {
        return socket.emit("error", { message: "Enter your name first." });
      }

      const code = generateRoomCode();
      const room = new RoomGame(code);
      rooms.set(code, room);
      const verifier = crypto.randomUUID();
      room.addPlayer(socket.id, name.trim(), verifier, true);
      room.setRoundCount(socket.id, totalRounds);
      const unavailable = applyPreferredPlayerOptions(room, socket.id, { preferredKey, preferredThemeCommand, preferredThemeColor });
      currentRoom = code;
      socket.join(code);
      socket.emit("roomCreated", { room: room.getRoomState(), playerId: socket.id, verifier, hostReclaimToken: room.getHostReclaimToken() });
      if (unavailable.length) socket.emit("preferenceConflict", { unavailable });
      emitRoomState(io, room);
    });

    socket.on("joinRoom", ({ name, room: code, verifier, hostReclaimToken, preferredKey, preferredThemeCommand, preferredThemeColor }) => {
      if (!name?.trim() || !code?.trim()) {
        return socket.emit("error", { message: "Enter both name and room code." });
      }

      const room = rooms.get(code.trim().toUpperCase());
      if (!room) return socket.emit("error", { message: "Room not found." });
      if ([ROOM_STATUS.STARTING, ROOM_STATUS.COUNTDOWN, ROOM_STATUS.WAITING, ROOM_STATUS.REACT, ROOM_STATUS.GAME_OVER, ROOM_STATUS.CLOSED].includes(room.status)) {
        return socket.emit("error", { message: "Room is not accepting new players right now." });
      }
      if (room.players.size >= 4) return socket.emit("error", { message: "Room is full." });

      const normalizedName = name.trim();
      const normalizedVerifier = String(verifier || "").trim();
      const normalizedHostReclaimToken = String(hostReclaimToken || "").trim();
      let result = null;

      if (!normalizedVerifier) {
        result = { ok: false, message: "Missing player verifier." };
      }

      if (!result && room.isBlacklisted(normalizedName, normalizedVerifier)) {
        result = { ok: false, message: "You were kicked from this lobby and cannot rejoin it." };
      }

      if (!result) {
        if (normalizedHostReclaimToken) {
          result = room.reclaimHost(socket.id, normalizedHostReclaimToken);
        }

        if (!result) {
          const matchingPlayer = room.findMatchingPlayer(normalizedName, normalizedVerifier);
          if (matchingPlayer) {
            result = room.reclaimPlayer(socket.id, normalizedName, normalizedVerifier);
          } else if (room.hasPlayerName(normalizedName)) {
            result = { ok: false, message: "That name is already in use by another player in this room. Pick a different name." };
          } else {
            const added = room.addPlayer(socket.id, normalizedName, normalizedVerifier);
            const unavailable = added ? applyPreferredPlayerOptions(room, socket.id, { preferredKey, preferredThemeCommand, preferredThemeColor }) : [];
            if (added && unavailable.length) result = { ok: true, player: added, created: true, unavailable };
            else if (added) result = { ok: true, player: added, created: true };
            else result = { ok: false, message: "Unable to join this room right now." };
          }
        }
      }

      if (!result.ok) {
        return socket.emit("error", { message: result.message });
      }
      currentRoom = room.roomCode;
      socket.join(room.roomCode);
      socket.emit("roomJoined", { room: room.getRoomState(), playerId: socket.id, verifier: normalizedVerifier, hostReclaimToken: room.getHostReclaimToken() });
      if (result.unavailable?.length) socket.emit("preferenceConflict", { unavailable: result.unavailable });
      emitRoomState(io, room);
    });

    socket.on("bindTheme", ({ themeCommand, color }) => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const result = room.bindTheme(socket.id, themeCommand, color);
      if (!result.ok) {
        return socket.emit("error", { message: result.message });
      }

      socket.emit("themeBound", { themeCommand: result.themeCommand, color: result.color });
      emitRoomState(io, room);
    });

    socket.on("bindKey", ({ key }) => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const result = room.bindKey(socket.id, key);
      if (!result.ok) {
        return socket.emit("error", { message: result.message });
      }

      socket.emit("keyBound", { key: result.key });
      emitRoomState(io, room);
    });

    socket.on("requestLobbyView", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      room.returnToLobby(socket.id);
      emitRoomState(io, room);
      io.to(room.roomCode).emit("lobbyStatus", {
        waitingFor: room.getWaitingList()
      });

      const player = room.players.get(socket.id);
      if (player) {
        socket.emit("roomState", room.getRoomState());
      }
    });

    socket.on("setRoundCount", ({ totalRounds }) => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const result = room.setRoundCount(socket.id, totalRounds);
      if (!result.ok) {
        return socket.emit("error", { message: result.message });
      }

      emitRoomState(io, room);
    });

    socket.on("toggleReady", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const toggled = room.toggleReady(socket.id);
      if (!toggled) {
        return socket.emit("error", { message: "Unable to change ready state right now." });
      }

      emitRoomState(io, room);
    });

    socket.on("startGame", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room || room.hostId !== socket.id) return;

      if (!room.canStart()) {
        return socket.emit("error", { message: "Need at least 2 ready players to start." });
      }

      if (!room.beginMatch()) {
        return socket.emit("error", { message: "Unable to start the match." });
      }

      emitRoomState(io, room);
      io.to(room.roomCode).emit("matchStarting", {
        players: getTransitionPlayers(room),
        duration: MATCH_TRANSITION_DURATION_MS,
        splashDuration: MATCH_PLAYER_SPLASH_DURATION_MS
      });
      room._schedule(setTimeout(() => {
        if (room.status === ROOM_STATUS.STARTING) {
          startNextRound(io, room);
        }
      }, MATCH_TRANSITION_DURATION_MS + MATCH_PLAYER_SPLASH_DURATION_MS));
    });

    socket.on("playerInput", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player || !player.connected || player._pressed) return;

      if (room.status === ROOM_STATUS.WAITING) {
        player._pressed = true;
        player._falseStart = true;
        player.falseStarts += 1;
        player._reactionTime = 500;
        io.to(currentRoom).emit("falseStart", { id: socket.id, name: player.name });
        return;
      }

      if (room.status === ROOM_STATUS.REACT) {
        player._pressed = true;
        player._reactionTime = Math.round(performance.now() - room._reactStart);
        io.to(currentRoom).emit("playerReacted", { id: socket.id, name: player.name, time: player._reactionTime });

        const activePlayers = room._connectedPlayers();
        const allPressed = activePlayers.every((entry) => entry._pressed);
        if (allPressed) {
          room._clearTimers();
          endRound(io, room);
        }
      }
    });

    socket.on("nextRound", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room || room.hostId !== socket.id) return;
      if (room.status !== ROOM_STATUS.ROUND_END) return;
      startNextRound(io, room);
    });

    socket.on("playAgain", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room || room.hostId !== socket.id) return;

      room.status = ROOM_STATUS.POST_MATCH;
      room.returnToLobby(socket.id);
      emitRoomState(io, room);
      io.to(room.roomCode).emit("lobbyStatus", {
        waitingFor: room.getWaitingList()
      });
    });

    socket.on("removePlayer", ({ playerId }) => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room || room.hostId !== socket.id) return;
      if (!playerId || playerId === socket.id) return;

      const removed = room.removePlayer(playerId);
      if (!removed.ok) return;

      room.blacklistPlayer(removed.player);

      const kickedSocket = io.sockets.sockets.get(playerId);
      if (kickedSocket) {
        kickedSocket.leave(room.roomCode);
        kickedSocket.emit("removedFromLobby", { room: room.roomCode, reason: "kicked", message: "You were kicked from the lobby." });
      }

      emitRoomState(io, room);
    });

    socket.on("closeRoom", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room || room.hostId !== socket.id) return;
      closeRoom(io, room, "host_closed");
    });

    socket.on("leaveRoom", () => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;
      const player = room.players.get(socket.id) || null;
      const leaveMessage = player ? room.addSystemChatMessage(player, "left the room.") : null;

      room.removePlayer(socket.id);
      socket.leave(room.roomCode);
      currentRoom = null;
      socket.emit("roomClosed", { room: room.roomCode, reason: "left" });

      if (room.players.size === 0) {
        closeRoom(io, room, "empty");
        return;
      }

      emitRoomState(io, room);
      if (leaveMessage) emitChatMessages(io, room, leaveMessage);
      io.to(room.roomCode).emit("lobbyStatus", {
        waitingFor: room.getWaitingList()
      });
    });

    socket.on("sendChatMessage", ({ content }) => {
      const room = currentRoom ? rooms.get(currentRoom) : null;
      if (!room) return;

      const result = room.addChatMessage(socket.id, content);
      if (!result.ok) {
        return socket.emit("error", { message: result.message });
      }

      io.to(room.roomCode).emit("chatMessage", {
        message: result.message,
        messages: room.chatMessages
      });
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;

      const room = rooms.get(currentRoom);
      if (!room) return;
      const player = room.players.get(socket.id) || null;
      const shouldAnnounceLeave = Boolean(player?.connected);
      const leaveMessage = shouldAnnounceLeave ? room.addSystemChatMessage(player, "left the room.") : null;

      const result = room.markDisconnected(socket.id);

      // Keep room and slot alive for reclaim while the stale timeout runs.
      if (room.status === ROOM_STATUS.WAITING_FOR_PLAYERS || room.status === ROOM_STATUS.READY_CHECK || room.status === ROOM_STATUS.POST_MATCH) {
        io.to(room.roomCode).emit("lobbyStatus", { waitingFor: room.getWaitingList() });
      }

      if (result.closed) {
        closeRoom(io, room, "empty");
        return;
      }

      if (result.endMatch) {
        if (leaveMessage) emitChatMessages(io, room, leaveMessage);
        endGame(io, room);
        return;
      }

      if (room.status !== ROOM_STATUS.CLOSED) {
        room.setLobbyView(socket.id, false);
        emitRoomState(io, room);
        if (leaveMessage) emitChatMessages(io, room, leaveMessage);
      }
    });
  });
}

module.exports = { initGameSockets, ROOM_STATUS };
