import { normalizeGameKey, type GameKey } from "./keys";

const scheduleTimeout = globalThis.setTimeout.bind(globalThis);
const scheduleInterval = globalThis.setInterval.bind(globalThis);
const cancelTimeout = globalThis.clearTimeout.bind(globalThis);
const cancelInterval = globalThis.clearInterval.bind(globalThis);
const getTimestamp = globalThis.performance.now.bind(globalThis.performance);
const getRandom = Math.random;

export const GameState = Object.freeze({
  LOBBY: "lobby",
  COUNTDOWN: "countdown",
  WAITING: "waiting",
  REACT: "react",
  ROUND_END: "roundEnd",
  GAME_OVER: "gameOver",
} as const);

export type GameStateValue = (typeof GameState)[keyof typeof GameState];

export type PlayerData = {
  id: string;
  name: string;
  key: GameKey | null;
  color: string;
  themeCommand: string | null;
  totalScore: number;
  roundTimes: number[];
  wins: number;
  falseStarts: number;
  ready: boolean;
  bestTime: number;
  avgTime: number;
  _pressed: boolean;
  _reactionTime: number | null;
  _falseStart: boolean;
};

export type RoundResult = {
  id: string;
  name: string;
  time: number;
  falseStart: boolean;
  missed: boolean;
  points?: number;
};

export type RoundData = {
  roundNum: number;
  results: RoundResult[];
};

export type Standing = {
  id: string;
  name: string;
  color: string;
  themeCommand: string | null;
  totalScore: number;
  wins: number;
  bestTime: number | null;
  avgTime: number | null;
  falseStarts: number;
  roundTimes: Array<number | null>;
};

export type GameEngineOptions = {
  totalRounds?: number;
  minDelay?: number;
  maxDelay?: number;
  countdownSeconds?: number;
  maxReactionTime?: number;
  falseStartPenalty?: number;
  targetScore?: number;
};

type StartGameOptions = {
  countdownDelayMs?: number;
};

type GameEventMap = {
  playerAdded: { id: string; name: string; color: string; themeCommand: string | null };
  playerRemoved: { id: string };
  playerReady: { id: string; name: string };
  playerUnready: { id: string; name: string };
  playerKeyMoved: { id: string; key: GameKey };
  allPlayersReady: Record<string, never>;
  gameStarted: { totalRounds: number };
  countdown: { remaining: number };
  waiting: { round: number };
  react: { round: number };
  falseStart: { id: string; name: string };
  playerReacted: { id: string; name: string; time: number };
  roundEnd: RoundData;
  gameOver: { standings: Standing[]; roundHistory: RoundData[] };
  resetToLobby: Record<string, never>;
  fullReset: Record<string, never>;
};

type GameEvent = keyof GameEventMap;
type Listener<Event extends GameEvent> = (data: GameEventMap[Event]) => void;
type AnyListener = (data: GameEventMap[GameEvent]) => void;
type TimeoutHandle = ReturnType<typeof setTimeout>;
type IntervalHandle = ReturnType<typeof setInterval>;

export class GameEngine {
  totalRounds: number;
  minDelay: number;
  maxDelay: number;
  countdownSeconds: number;
  maxReactionTime: number;
  falseStartPenalty: number;
  targetScore: number;
  players = new Map<string, PlayerData>();
  state: GameStateValue = GameState.LOBBY;
  currentRound = 0;
  roundHistory: RoundData[] = [];

  private countdownTimer: IntervalHandle | null = null;
  private delayTimer: TimeoutHandle | null = null;
  private roundStartTimer: TimeoutHandle | null = null;
  private reactTimeout: TimeoutHandle | null = null;
  private reactStartTime: number | null = null;
  private listeners: Record<string, AnyListener[]> = {};

  constructor(opts: GameEngineOptions = {}) {
    this.totalRounds = opts.totalRounds ?? 5;
    this.minDelay = opts.minDelay ?? 1000;
    this.maxDelay = opts.maxDelay ?? 5000;
    this.countdownSeconds = opts.countdownSeconds ?? 3;
    this.maxReactionTime = opts.maxReactionTime ?? 2000;
    this.falseStartPenalty = opts.falseStartPenalty ?? 500;
    this.targetScore = opts.targetScore ?? 10;
  }

  on<Event extends GameEvent>(event: Event, fn: Listener<Event>): void {
    (this.listeners[event] ??= []).push(fn as AnyListener);
  }

  off<Event extends GameEvent>(event: Event, fn: Listener<Event>): void {
    const listeners = this.listeners[event];
    if (listeners) this.listeners[event] = listeners.filter((listener) => listener !== fn);
  }

  private emit<Event extends GameEvent>(event: Event, data: GameEventMap[Event]): void {
    (this.listeners[event] || []).forEach((fn) => fn(data as GameEventMap[GameEvent]));
  }

  addPlayer(id: string, name: string, key: unknown = null, color = "#1f6feb", themeCommand: string | null = null): boolean {
    if (this.state !== GameState.LOBBY) return false;
    if (this.players.size >= 4) return false;
    if (this.players.has(id)) return false;

    const normalizedKey = key ? normalizeGameKey(key) : null;
    if (key && !normalizedKey) return false;

    if (normalizedKey) {
      for (const player of this.players.values()) {
        if (player.key === normalizedKey) return false;
      }
    }

    if (themeCommand) {
      for (const player of this.players.values()) {
        if (player.themeCommand === themeCommand) return false;
      }
    }

    this.players.set(id, {
      id,
      name,
      key: normalizedKey || null,
      color,
      themeCommand,
      totalScore: 0,
      roundTimes: [],
      wins: 0,
      falseStarts: 0,
      ready: false,
      bestTime: Infinity,
      avgTime: 0,
      _pressed: false,
      _reactionTime: null,
      _falseStart: false,
    });

    this.emit("playerAdded", { id, name, color, themeCommand });
    return true;
  }

  confirmPlayerByKey(key: unknown): boolean {
    const normalized = normalizeGameKey(key);
    if (!normalized) return false;

    for (const player of this.players.values()) {
      if (player.key === normalized) {
        player.ready = !player.ready;
        this.emit(player.ready ? "playerReady" : "playerUnready", { id: player.id, name: player.name });
        if (this.players.size >= 2 && this.allPlayersReady()) {
          this.emit("allPlayersReady", {});
        }
        return true;
      }
    }

    return false;
  }

  removePlayer(id: string): boolean {
    if (this.state !== GameState.LOBBY) return false;
    const removed = this.players.delete(id);
    if (removed) this.emit("playerRemoved", { id });
    return removed;
  }

  movePlayerKey(id: string, key: unknown): boolean {
    if (this.state !== GameState.LOBBY) return false;

    const player = this.players.get(id);
    const normalized = normalizeGameKey(key);
    if (!player || player.ready || !normalized) return false;

    for (const other of this.players.values()) {
      if (other.id !== id && other.key === normalized) return false;
    }

    if (player.key === normalized) return true;

    player.key = normalized;
    this.emit("playerKeyMoved", { id: player.id, key: normalized });
    return true;
  }

  getPlayer(id: string): PlayerData | undefined {
    return this.players.get(id);
  }

  getPlayers(): PlayerData[] {
    return [...this.players.values()];
  }

  startGame(options: StartGameOptions = {}): boolean {
    if (this.state !== GameState.LOBBY && this.state !== GameState.GAME_OVER) return false;
    if (this.players.size < 2) return false;
    if (!this.allPlayersReady()) return false;

    const countdownDelayMs = Math.max(0, Number(options.countdownDelayMs) || 0);

    for (const player of this.players.values()) {
      player.totalScore = 0;
      player.roundTimes = [];
      player.wins = 0;
      player.falseStarts = 0;
      player.bestTime = Infinity;
      player.avgTime = 0;
    }
    this.currentRound = 0;
    this.roundHistory = [];

    this.emit("gameStarted", { totalRounds: this.totalRounds });
    this.state = GameState.COUNTDOWN;
    if (countdownDelayMs > 0) {
      this.roundStartTimer = scheduleTimeout(() => {
        this.roundStartTimer = null;
        this.nextRoundInternal();
      }, countdownDelayMs);
    } else {
      this.nextRoundInternal();
    }
    return true;
  }

  handleInput(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player._pressed) return;

    player._pressed = true;

    if (this.state === GameState.WAITING) {
      player._falseStart = true;
      player.falseStarts += 1;
      player._reactionTime = this.falseStartPenalty;
      this.emit("falseStart", { id: playerId, name: player.name });
      return;
    }

    if (this.state === GameState.REACT) {
      const timestamp = getTimestamp();
      player._reactionTime = Math.round(timestamp - (this.reactStartTime ?? timestamp));
      this.emit("playerReacted", {
        id: playerId,
        name: player.name,
        time: player._reactionTime,
      });

      if ([...this.players.values()].every((entry) => entry._pressed)) {
        if (this.reactTimeout) cancelTimeout(this.reactTimeout);
        this.reactTimeout = null;
        this.endRound();
      }
    }
  }

  findPlayerByKey(key: unknown): string | null {
    const normalized = normalizeGameKey(key);
    if (!normalized) return null;

    for (const [id, player] of this.players) {
      if (player.key === normalized) return id;
    }
    return null;
  }

  nextRound(): void {
    if (this.state !== GameState.ROUND_END) return;

    const targetReached = [...this.players.values()].some((player) => player.totalScore >= this.targetScore);
    if (this.currentRound >= this.totalRounds || targetReached) {
      this.endGame();
      return;
    }

    this.nextRoundInternal();
  }

  _endRound(): void {
    this.endRound();
  }

  getStandings(): Standing[] {
    return this.getPlayers()
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
        roundTimes: player.roundTimes.map((time) => (time === Infinity ? null : time)),
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
        const aBest = a.bestTime ?? Infinity;
        const bBest = b.bestTime ?? Infinity;
        if (aBest !== bBest) return aBest - bBest;
        return a.name.localeCompare(b.name);
      });
  }

  resetToLobby(): void {
    this.clearTimers();
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.roundHistory = [];
    for (const player of this.players.values()) {
      player.totalScore = 0;
      player.roundTimes = [];
      player.wins = 0;
      player.falseStarts = 0;
      player.ready = false;
      player.bestTime = Infinity;
      player.avgTime = 0;
      player._pressed = false;
      player._reactionTime = null;
      player._falseStart = false;
    }
    this.emit("resetToLobby", {});
  }

  fullReset(): void {
    this.clearTimers();
    this.players.clear();
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.roundHistory = [];
    this.emit("fullReset", {});
  }

  toJSON(): {
    state: GameStateValue;
    currentRound: number;
    totalRounds: number;
    targetScore: number;
    players: Standing[];
    roundHistory: RoundData[];
  } {
    return {
      state: this.state,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      targetScore: this.targetScore,
      players: this.getStandings(),
      roundHistory: this.roundHistory,
    };
  }

  private allPlayersReady(): boolean {
    return this.players.size >= 2 && [...this.players.values()].every((player) => player.ready);
  }

  private nextRoundInternal(): void {
    this.currentRound += 1;
    if (this.currentRound > this.totalRounds) {
      this.endGame();
      return;
    }

    for (const player of this.players.values()) {
      player._pressed = false;
      player._reactionTime = null;
      player._falseStart = false;
    }

    this.startCountdown();
  }

  private startCountdown(): void {
    this.state = GameState.COUNTDOWN;
    let remaining = this.countdownSeconds;
    this.emit("countdown", { remaining });

    this.countdownTimer = scheduleInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (this.countdownTimer) cancelInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.startWaiting();
      } else {
        this.emit("countdown", { remaining });
      }
    }, 1000);
  }

  private startWaiting(): void {
    this.state = GameState.WAITING;
    const delay = this.minDelay + getRandom() * (this.maxDelay - this.minDelay);
    this.emit("waiting", { round: this.currentRound });

    this.delayTimer = scheduleTimeout(() => {
      this.delayTimer = null;
      this.goGreen();
    }, delay);
  }

  private goGreen(): void {
    this.state = GameState.REACT;
    this.reactStartTime = getTimestamp();
    this.emit("react", { round: this.currentRound });

    this.reactTimeout = scheduleTimeout(() => {
      this.endRound();
    }, this.maxReactionTime);
  }

  private endRound(): void {
    this.state = GameState.ROUND_END;

    const results: RoundResult[] = [];
    for (const player of this.players.values()) {
      const time = player._falseStart ? Infinity : (player._reactionTime ?? Infinity);

      player.roundTimes.push(time);
      results.push({
        id: player.id,
        name: player.name,
        time,
        falseStart: player._falseStart,
        missed: !player._pressed && !player._falseStart,
      });
    }

    results.sort((a, b) => a.time - b.time);

    const playerCount = this.players.size;
    let rank = 0;
    for (const result of results) {
      if (result.time === Infinity) {
        result.points = 0;
      } else {
        result.points = playerCount - rank;
        rank += 1;
      }
      const player = this.players.get(result.id);
      if (!player) continue;
      player.totalScore += result.points;
      if (result.points === playerCount) player.wins += 1;
      if (result.time < player.bestTime) player.bestTime = result.time;
    }

    for (const player of this.players.values()) {
      const validTimes = player.roundTimes.filter((time) => time < Infinity);
      player.avgTime = validTimes.length ? Math.round(validTimes.reduce((total, time) => total + time, 0) / validTimes.length) : 0;
    }

    const roundData = { roundNum: this.currentRound, results };
    this.roundHistory.push(roundData);
    this.emit("roundEnd", roundData);
  }

  private endGame(): void {
    this.state = GameState.GAME_OVER;
    this.emit("gameOver", {
      standings: this.getStandings(),
      roundHistory: this.roundHistory,
    });
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      cancelInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.delayTimer) {
      cancelTimeout(this.delayTimer);
      this.delayTimer = null;
    }
    if (this.roundStartTimer) {
      cancelTimeout(this.roundStartTimer);
      this.roundStartTimer = null;
    }
    if (this.reactTimeout) {
      cancelTimeout(this.reactTimeout);
      this.reactTimeout = null;
    }
  }
}
