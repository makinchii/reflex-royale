/**
 * GameEngine.js — Core state machine for Reflex Royale.
 *
 * States: lobby → countdown → waiting → react → roundEnd → gameOver
 *
 * This class is intentionally decoupled from the DOM so that the same
 * engine can drive both local (shared-keyboard) and remote (Socket.IO)
 * sessions.  UI binding happens in the renderer layer.
 *
 * Designed for future expansion (leaderboards, power-ups, tournaments).
 */

export const GameState = Object.freeze({
  LOBBY:      "lobby",
  COUNTDOWN:  "countdown",
  WAITING:    "waiting",
  REACT:      "react",
  ROUND_END:  "roundEnd",
  GAME_OVER:  "gameOver",
});

export class GameEngine {
  /**
   * @param {Object} opts
   * @param {number} opts.totalRounds        – rounds per match (default 5)
   * @param {number} opts.minDelay           – min ms before green light (default 1000)
   * @param {number} opts.maxDelay           – max ms before green light (default 5000)
   * @param {number} opts.countdownSeconds   – 3-2-1 seconds (default 3)
   * @param {number} opts.maxReactionTime    – auto-fail threshold in ms (default 2000)
   * @param {number} opts.falseStartPenalty  – ms penalty for early press (default 500)
   */
  constructor(opts = {}) {
    this.totalRounds      = opts.totalRounds      ?? 5;
    this.minDelay         = opts.minDelay         ?? 1000;
    this.maxDelay         = opts.maxDelay         ?? 5000;
    this.countdownSeconds = opts.countdownSeconds  ?? 3;
    this.maxReactionTime  = opts.maxReactionTime   ?? 2000;
    this.falseStartPenalty = opts.falseStartPenalty ?? 500;

    /** @type {Map<string, PlayerData>} keyed by playerId */
    this.players = new Map();

    this.state        = GameState.LOBBY;
    this.currentRound = 0;
    this.roundHistory = [];          // [{roundNum, results:[{id,name,time,falseStart}]}]

    // Internal timing handles
    this._countdownTimer  = null;
    this._delayTimer      = null;
    this._reactStartTime  = null;

    // Event bus (simple observer)
    this._listeners = {};
  }

  /* ───────── Event bus ───────── */

  on(event, fn)  { (this._listeners[event] ??= []).push(fn); }
  off(event, fn) {
    const arr = this._listeners[event];
    if (arr) this._listeners[event] = arr.filter(f => f !== fn);
  }
  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  /* ───────── Player management ───────── */

  /**
   * Register a player.
   * @param {string} id     – unique id (e.g. "p1", socket id, etc.)
   * @param {string} name   – display name
   * @param {string} [key]  – keyboard key for local mode (e.g. "q")
   * @param {string} [color]– hex colour
   * @returns {boolean} success
   */
  addPlayer(id, name, key = null, color = "#1f6feb") {
    if (this.state !== GameState.LOBBY) return false;
    if (this.players.size >= 4) return false;
    if (this.players.has(id)) return false;

    // Prevent duplicate key bindings in local mode
    if (key) {
      for (const p of this.players.values()) {
        if (p.key === key.toLowerCase()) return false;
      }
    }

    this.players.set(id, {
      id,
      name,
      key: key ? key.toLowerCase() : null,
      color,
      totalScore: 0,
      roundTimes: [],       // ms per round (Infinity = missed / false-start)
      wins: 0,
      falseStarts: 0,
      bestTime: Infinity,
      avgTime: 0,
      _pressed: false,      // for current round
      _reactionTime: null,
      _falseStart: false,
    });

    this._emit("playerAdded", { id, name, color });
    return true;
  }

  removePlayer(id) {
    if (this.state !== GameState.LOBBY) return false;
    const removed = this.players.delete(id);
    if (removed) this._emit("playerRemoved", { id });
    return removed;
  }

  getPlayer(id) { return this.players.get(id); }
  getPlayers()  { return [...this.players.values()]; }

  /* ───────── Game flow ───────── */

  /** Start match from lobby */
  startGame() {
    if (this.state !== GameState.LOBBY && this.state !== GameState.GAME_OVER) return false;
    if (this.players.size < 2) return false;

    // Reset cumulative stats for a new match
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

    this._emit("gameStarted", { totalRounds: this.totalRounds });
    this._nextRound();
    return true;
  }

  /** Internal – advance to the next round or end the match */
  _nextRound() {
    this.currentRound++;
    if (this.currentRound > this.totalRounds) {
      this._endGame();
      return;
    }

    // Reset per-round player state
    for (const p of this.players.values()) {
      p._pressed = false;
      p._reactionTime = null;
      p._falseStart = false;
    }

    this._startCountdown();
  }

  /* ── Countdown phase ── */

  _startCountdown() {
    this.state = GameState.COUNTDOWN;
    let remaining = this.countdownSeconds;
    this._emit("countdown", { remaining });

    this._countdownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this._countdownTimer);
        this._countdownTimer = null;
        this._startWaiting();
      } else {
        this._emit("countdown", { remaining });
      }
    }, 1000);
  }

  /* ── Waiting phase (red / yellow light — random delay) ── */

  _startWaiting() {
    this.state = GameState.WAITING;
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    this._emit("waiting", { round: this.currentRound });

    this._delayTimer = setTimeout(() => {
      this._delayTimer = null;
      this._goGreen();
    }, delay);
  }

  /* ── React phase (green light!) ── */

  _goGreen() {
    this.state = GameState.REACT;
    this._reactStartTime = performance.now();
    this._emit("react", { round: this.currentRound });

    // Auto-end round after maxReactionTime if not everyone pressed
    this._reactTimeout = setTimeout(() => {
      this._endRound();
    }, this.maxReactionTime);
  }

  /* ── Player input ── */

  /**
   * Register a key/button press from a player.
   * Can be called from keyboard handler or socket message.
   * @param {string} playerId
   */
  handleInput(playerId) {
    const p = this.players.get(playerId);
    if (!p || p._pressed) return;   // ignore if unknown or already pressed

    p._pressed = true;

    if (this.state === GameState.WAITING) {
      // False start!
      p._falseStart = true;
      p.falseStarts++;
      p._reactionTime = this.falseStartPenalty;
      this._emit("falseStart", { id: playerId, name: p.name });
      return;
    }

    if (this.state === GameState.REACT) {
      const now = performance.now();
      p._reactionTime = Math.round(now - this._reactStartTime);
      this._emit("playerReacted", {
        id: playerId,
        name: p.name,
        time: p._reactionTime,
      });

      // Check if all players have pressed
      const allPressed = [...this.players.values()].every(pl => pl._pressed);
      if (allPressed) {
        clearTimeout(this._reactTimeout);
        this._endRound();
      }
      return;
    }

    // In any other state, ignore
  }

  /**
   * Find a player by their bound key (for local keyboard mode).
   * @param {string} key – lowercase key string
   * @returns {string|null} playerId or null
   */
  findPlayerByKey(key) {
    for (const [id, p] of this.players) {
      if (p.key === key.toLowerCase()) return id;
    }
    return null;
  }

  /* ── Round end ── */

  _endRound() {
    this.state = GameState.ROUND_END;

    const results = [];
    for (const p of this.players.values()) {
      const time = p._falseStart
        ? Infinity
        : (p._reactionTime ?? Infinity);

      p.roundTimes.push(time);
      results.push({
        id: p.id,
        name: p.name,
        time,
        falseStart: p._falseStart,
        missed: !p._pressed && !p._falseStart,
      });
    }

    // Sort fastest first (Infinity sorts to end)
    results.sort((a, b) => a.time - b.time);

    // Award points: 1st place gets N pts, 2nd N-1 … (only for valid times)
    const playerCount = this.players.size;
    let rank = 0;
    for (const r of results) {
      if (r.time === Infinity) {
        r.points = 0;
      } else {
        r.points = playerCount - rank;
        rank++;
      }
      const p = this.players.get(r.id);
      p.totalScore += r.points;
      if (r.points === playerCount) p.wins++;
      if (r.time < p.bestTime) p.bestTime = r.time;
    }

    // Recalculate averages
    for (const p of this.players.values()) {
      const valid = p.roundTimes.filter(t => t < Infinity);
      p.avgTime = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    }

    const roundData = { roundNum: this.currentRound, results };
    this.roundHistory.push(roundData);

    this._emit("roundEnd", roundData);
  }

  /** Called by UI after showing round results to proceed */
  nextRound() {
    if (this.state !== GameState.ROUND_END) return;
    this._nextRound();
  }

  /* ── Game over ── */

  _endGame() {
    this.state = GameState.GAME_OVER;

    const standings = this.getStandings();
    this._emit("gameOver", {
      standings,
      roundHistory: this.roundHistory,
    });
  }

  /**
   * Get current standings sorted by total score descending.
   * @returns {Array<Object>}
   */
  getStandings() {
    return this.getPlayers()
      .map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        totalScore: p.totalScore,
        wins: p.wins,
        bestTime: p.bestTime === Infinity ? null : p.bestTime,
        avgTime: p.avgTime || null,
        falseStarts: p.falseStarts,
        roundTimes: p.roundTimes.map(t => t === Infinity ? null : t),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /** Return to lobby for a new match */
  resetToLobby() {
    this._clearTimers();
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.roundHistory = [];
    for (const p of this.players.values()) {
      p.totalScore = 0;
      p.roundTimes = [];
      p.wins = 0;
      p.falseStarts = 0;
      p.bestTime = Infinity;
      p.avgTime = 0;
      p._pressed = false;
      p._reactionTime = null;
      p._falseStart = false;
    }
    this._emit("resetToLobby", {});
  }

  /** Full reset — clear players too */
  fullReset() {
    this._clearTimers();
    this.players.clear();
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.roundHistory = [];
    this._emit("fullReset", {});
  }

  _clearTimers() {
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    if (this._delayTimer) { clearTimeout(this._delayTimer); this._delayTimer = null; }
    if (this._reactTimeout) { clearTimeout(this._reactTimeout); this._reactTimeout = null; }
  }

  /* ───────── Serialisation (for networking / leaderboards) ───────── */

  toJSON() {
    return {
      state: this.state,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      players: this.getStandings(),
      roundHistory: this.roundHistory,
    };
  }
}
