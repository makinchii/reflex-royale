export const ONLINE_STORAGE_KEYS = Object.freeze({
  verifier: "reflexRoyaleVerifier",
  hostReclaimToken: "reflexRoyaleHostReclaimToken",
  roomCode: "reflexRoyaleRoomCode",
  playerName: "reflexRoyalePlayerName",
  preferredKey: "reflexRoyalePreferredKey",
});

export type OnlineRoomStatus =
  | "waiting_for_players"
  | "ready_check"
  | "starting"
  | "countdown"
  | "waiting"
  | "react"
  | "roundEnd"
  | "post_match"
  | "gameOver"
  | "closed";

export type OnlineRoundOutcome = "valid" | "false_start" | "timeout" | "disconnected";

export interface OnlinePlayer {
  id: string;
  name: string;
  color: string;
  themeCommand: string | null;
  connected: boolean;
  isReady: boolean;
  isHost: boolean;
  keySet: boolean;
  hasKeyBinding: boolean;
  keyBinding: string | null;
  isInLobbyView: boolean;
  lastSeenAt: number;
  joinedAt: number;
}

export interface OnlineStanding {
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
}

export interface OnlineRoundResult {
  id: string;
  name: string;
  time: number;
  falseStart: boolean;
  missed: boolean;
  disconnected: boolean;
  outcome: OnlineRoundOutcome;
  points: number;
}

export interface OnlineRoundSummary {
  roundNum: number;
  results: OnlineRoundResult[];
}

export interface OnlineChatMessage {
  id?: string;
  playerId?: string;
  name?: string;
  content: string;
  createdAt?: number;
}

export interface OnlineRoomState {
  room: string;
  status: OnlineRoomStatus;
  hostId: string | null;
  currentRound: number;
  totalRounds: number;
  targetScore: number;
  canStart: boolean;
  playerCount: number;
  readyCount: number;
  waitingFor: string[];
  standings: OnlineStanding[];
  roundHistory: OnlineRoundSummary[];
  chatMessages: OnlineChatMessage[];
  players: OnlinePlayer[];
}

export interface OnlinePreferredPlayerOptions {
  preferredKey?: string;
  preferredThemeCommand?: string;
  preferredThemeColor?: string;
}

export interface OnlineClientToServerEvents {
  createRoom: { name: string; verifier: string; totalRounds: number } & OnlinePreferredPlayerOptions;
  checkSavedRoom: { name: string; room: string; verifier: string };
  joinRoom: { name: string; room: string; verifier: string; hostReclaimToken?: string } & OnlinePreferredPlayerOptions;
  bindTheme: { themeCommand: string; color: string };
  bindKey: { key: string };
  toggleReady: undefined;
  startGame: undefined;
  setRoundCount: { totalRounds: number };
  closeRoom: undefined;
  removePlayer: { playerId: string };
  sendChatMessage: { content: string };
  requestLobbyView: undefined;
  validateCurrentRoom: undefined;
  leaveRoom: undefined;
  nextRound: undefined;
  playAgain: undefined;
  playerInput: undefined;
}

export interface OnlineServerToClientEvents {
  roomCreated: { room: OnlineRoomState; playerId: string; verifier?: string; hostReclaimToken?: string };
  roomJoined: { room: OnlineRoomState; playerId: string; verifier?: string; hostReclaimToken?: string };
  savedRoomChecked: { room: string; valid: boolean; reason?: string };
  roomState: OnlineRoomState;
  keyBound: { key: string };
  themeBound: { themeCommand?: string; color?: string };
  preferenceConflict: { unavailable?: string[] };
  matchStarting: { players?: Array<Pick<OnlinePlayer, "id" | "name" | "color" | "themeCommand"> & { key?: string | null }>; duration?: number; splashDuration?: number };
  playerList: { players: OnlinePlayer[] };
  chatMessage: { messages: OnlineChatMessage[] };
  lobbyStatus: { waitingFor?: string[] };
  removedFromLobby: { room?: string; reason?: string; message?: string } | undefined;
  countdown: { remaining: number };
  waiting: Record<string, never> | undefined;
  react: Record<string, never> | undefined;
  falseStart: { id: string; name?: string };
  playerReacted: { id: string; name?: string; time: number };
  roundEnd: OnlineRoundSummary;
  gameOver: { standings: OnlineStanding[]; roundHistory?: OnlineRoundSummary[] };
  roomClosed: { room?: string; reason?: "left" | "host_closed" | "empty" | "stale" | string; message?: string };
  error: { message: string };
}

export type OnlineServerEventName = keyof OnlineServerToClientEvents;
