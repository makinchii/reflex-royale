import type {
  OnlineRoomState,
  OnlineRoundSummary,
  OnlineServerToClientEvents,
  OnlineStanding,
} from "./client-contract";

const REJOIN_AVAILABLE_MESSAGE = "Connection lost. Attempt rejoin or join a different room?";
const REJOIN_UNAVAILABLE_MESSAGE = "Unable to rejoin room. You must join a different room.";

export type OnlineView =
  | "join"
  | "checking_saved_room"
  | "reconnect_prompt"
  | "lobby"
  | "post_match"
  | "match"
  | "round_end"
  | "game_over";

export type OnlineMatchPhase = "idle" | "countdown" | "waiting" | "react" | "round_end" | "game_over";

export interface OnlineSavedRoomState {
  roomCode: string;
  playerName: string;
  hostReclaimToken: string;
}

export interface OnlineClientState {
  view: OnlineView;
  matchPhase: OnlineMatchPhase;
  myPlayerId: string | null;
  isHost: boolean;
  roomState: OnlineRoomState | null;
  selectedKey: string | null;
  selectedThemeCommand: string | null;
  selectedThemeColor: string | null;
  verifier: string;
  savedRoom: OnlineSavedRoomState;
  autoReconnectEnabled: boolean;
  pendingJoinSource: "auto" | "manual" | null;
  preferenceConflict: string[];
  countdownRemaining: number | null;
  lastRoundEnd: OnlineRoundSummary | null;
  standings: OnlineStanding[];
  errorMessage: string | null;
  notification: { kind: "error" | "info"; message: string } | null;
  matchInProgress: boolean;
}

export type OnlineClientAction =
  | { type: "savedRoomCheckStarted" }
  | { type: "joinSavedRoomRequested" }
  | { type: "savedRoomDeclined" }
  | { type: "manualJoinRequested"; room: string; name: string }
  | { type: "roomCreated"; payload: OnlineServerToClientEvents["roomCreated"] }
  | { type: "roomJoined"; payload: OnlineServerToClientEvents["roomJoined"] }
  | { type: "savedRoomChecked"; payload: OnlineServerToClientEvents["savedRoomChecked"] }
  | { type: "roomState"; payload: OnlineServerToClientEvents["roomState"] }
  | { type: "playerList"; payload: OnlineServerToClientEvents["playerList"] }
  | { type: "chatMessage"; payload: OnlineServerToClientEvents["chatMessage"] }
  | { type: "lobbyStatus"; payload: OnlineServerToClientEvents["lobbyStatus"] }
  | { type: "keyBound"; payload: OnlineServerToClientEvents["keyBound"] }
  | { type: "themeBound"; payload: OnlineServerToClientEvents["themeBound"] }
  | { type: "preferenceConflict"; payload: OnlineServerToClientEvents["preferenceConflict"] }
  | { type: "matchStarting"; payload: OnlineServerToClientEvents["matchStarting"] }
  | { type: "countdown"; payload: OnlineServerToClientEvents["countdown"] }
  | { type: "waiting"; payload?: OnlineServerToClientEvents["waiting"] }
  | { type: "react"; payload?: OnlineServerToClientEvents["react"] }
  | { type: "roundEnd"; payload: OnlineServerToClientEvents["roundEnd"] }
  | { type: "gameOver"; payload: OnlineServerToClientEvents["gameOver"] }
  | { type: "removedFromLobby"; payload?: OnlineServerToClientEvents["removedFromLobby"] }
  | { type: "roomClosed"; payload: OnlineServerToClientEvents["roomClosed"] }
  | { type: "socketDisconnected"; payload?: { message?: string } }
  | { type: "error"; payload: OnlineServerToClientEvents["error"] };

export function createInitialOnlineClientState(options: Partial<Pick<OnlineClientState, "verifier" | "autoReconnectEnabled">> & Partial<OnlineSavedRoomState> = {}): OnlineClientState {
  const savedRoom = {
    roomCode: options.roomCode || "",
    playerName: options.playerName || "",
    hostReclaimToken: options.hostReclaimToken || "",
  };
  const autoReconnectEnabled = options.autoReconnectEnabled ?? true;

  return {
    view: autoReconnectEnabled && savedRoom.roomCode && savedRoom.playerName ? "checking_saved_room" : "join",
    matchPhase: "idle",
    myPlayerId: null,
    isHost: false,
    roomState: null,
    selectedKey: null,
    selectedThemeCommand: null,
    selectedThemeColor: null,
    verifier: options.verifier || "",
    savedRoom,
    autoReconnectEnabled,
    pendingJoinSource: null,
    preferenceConflict: [],
    countdownRemaining: null,
    lastRoundEnd: null,
    standings: [],
    errorMessage: null,
    notification: null,
    matchInProgress: false,
  };
}

export function onlineClientReducer(state: OnlineClientState, action: OnlineClientAction): OnlineClientState {
  switch (action.type) {
    case "savedRoomCheckStarted":
      if (!state.autoReconnectEnabled || !state.savedRoom.roomCode || !state.savedRoom.playerName) return { ...state, view: "join" };
      return { ...state, view: "checking_saved_room", roomState: null, errorMessage: null, notification: null };

    case "joinSavedRoomRequested":
      if (!state.savedRoom.roomCode || !state.savedRoom.playerName) return { ...state, view: "join", pendingJoinSource: null };
      return { ...state, pendingJoinSource: "auto", errorMessage: null, notification: null };

    case "savedRoomDeclined":
      return {
        ...state,
        view: "join",
        autoReconnectEnabled: false,
        pendingJoinSource: null,
        savedRoom: clearSavedRoom(state.savedRoom, true),
        errorMessage: null,
        notification: null,
      };

    case "manualJoinRequested":
      return {
        ...state,
        pendingJoinSource: "manual",
        savedRoom: { ...state.savedRoom, roomCode: action.room, playerName: action.name },
        errorMessage: null,
        notification: null,
      };

    case "roomCreated":
    case "roomJoined": {
      const { room, playerId, verifier, hostReclaimToken } = action.payload;
      const currentPlayer = room.players.find((player) => player.id === playerId);
      return {
        ...state,
        view: getViewForRoomState(room, playerId, state.lastRoundEnd),
        matchPhase: getMatchPhaseForRoom(room.status),
        myPlayerId: playerId,
        isHost: room.hostId === playerId,
        roomState: room,
        selectedKey: currentPlayer?.keyBinding || state.selectedKey || null,
        verifier: verifier || state.verifier,
        savedRoom: {
          roomCode: room.room,
          playerName: currentPlayer?.name || state.savedRoom.playerName,
          hostReclaimToken: hostReclaimToken || state.savedRoom.hostReclaimToken,
        },
        autoReconnectEnabled: true,
        pendingJoinSource: null,
        errorMessage: null,
        notification: null,
        matchInProgress: isMatchStatus(room.status),
      };
    }

    case "savedRoomChecked":
      if (!state.autoReconnectEnabled || action.payload.room !== state.savedRoom.roomCode) return state;
      if (action.payload.valid) return { ...state, view: "reconnect_prompt", roomState: null };
      return { ...state, view: "join", savedRoom: clearSavedRoom(state.savedRoom), pendingJoinSource: null };

    case "roomState":
      if (!state.myPlayerId) return state;
      const currentPlayer = action.payload.players.find((player) => player.id === state.myPlayerId);
      return {
        ...state,
        view: getViewForRoomState(action.payload, state.myPlayerId, state.lastRoundEnd),
        matchPhase: getMatchPhaseForRoom(action.payload.status),
        roomState: action.payload,
        isHost: action.payload.hostId === state.myPlayerId,
        selectedKey: currentPlayer?.keyBinding || state.selectedKey || null,
        lastRoundEnd: action.payload.status === "waiting_for_players" || action.payload.status === "ready_check" || action.payload.status === "post_match" ? null : state.lastRoundEnd,
        matchInProgress: isMatchStatus(action.payload.status),
      };

    case "playerList": {
      if (!state.roomState || !state.myPlayerId) return state;
      const players = action.payload.players || [];
      const hostId = players.find((player) => player.isHost)?.id || state.roomState.hostId;
      const currentPlayer = players.find((player) => player.id === state.myPlayerId);
      const roomState = {
        ...state.roomState,
        hostId,
        playerCount: players.length,
        readyCount: players.filter((player) => player.isReady && player.connected).length,
        players,
      };
      return {
        ...state,
        roomState,
        isHost: hostId === state.myPlayerId,
        selectedKey: currentPlayer?.keyBinding || state.selectedKey || null,
        view: getViewForRoomState(roomState, state.myPlayerId, state.lastRoundEnd),
      };
    }

    case "chatMessage":
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          chatMessages: action.payload.messages || [],
        },
      };

    case "lobbyStatus":
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          waitingFor: action.payload.waitingFor || [],
        },
      };

    case "keyBound":
      return { ...state, selectedKey: action.payload.key || null };

    case "themeBound":
      return updateCurrentPlayerTheme({
        ...state,
        selectedThemeCommand: action.payload.themeCommand || state.selectedThemeCommand,
        selectedThemeColor: action.payload.color || state.selectedThemeColor,
      }, action.payload.themeCommand, action.payload.color);

    case "preferenceConflict":
      return { ...state, preferenceConflict: action.payload.unavailable || [] };

    case "matchStarting":
      return { ...state, matchInProgress: true, errorMessage: null, notification: null };

    case "countdown":
      return {
        ...state,
        view: "match",
        matchPhase: "countdown",
        countdownRemaining: action.payload.remaining,
        lastRoundEnd: null,
        matchInProgress: true,
      };

    case "waiting":
      return { ...state, view: "match", matchPhase: "waiting", countdownRemaining: null, matchInProgress: true };

    case "react":
      return { ...state, view: "match", matchPhase: "react", countdownRemaining: null, matchInProgress: true };

    case "roundEnd":
      return { ...state, view: "round_end", matchPhase: "round_end", lastRoundEnd: action.payload, countdownRemaining: null, matchInProgress: true };

    case "gameOver":
      return { ...state, view: "game_over", matchPhase: "game_over", standings: action.payload.standings || [], matchInProgress: false };

    case "removedFromLobby":
      return {
        ...state,
        view: "join",
        matchPhase: "idle",
        myPlayerId: null,
        isHost: false,
        roomState: null,
        selectedKey: null,
        savedRoom: clearSavedRoom(state.savedRoom, true),
        autoReconnectEnabled: false,
        pendingJoinSource: null,
        lastRoundEnd: null,
        standings: [],
        matchInProgress: false,
        notification: { kind: "error", message: action.payload?.message || "You were kicked from the lobby." },
      };

    case "roomClosed": {
      const staleRoom = action.payload.reason === "stale";
      const clearPlayerName = action.payload.reason === "left" || action.payload.reason === "host_closed";
      const savedRoom = staleRoom ? state.savedRoom : clearSavedRoom(state.savedRoom, clearPlayerName);
      const canReconnect = Boolean(savedRoom.roomCode && savedRoom.playerName && state.autoReconnectEnabled);
      const message = staleRoom ? (canReconnect ? REJOIN_AVAILABLE_MESSAGE : REJOIN_UNAVAILABLE_MESSAGE) : action.payload.message || null;
      return {
        ...state,
        view: staleRoom && canReconnect ? "reconnect_prompt" : "join",
        matchPhase: "idle",
        myPlayerId: null,
        isHost: false,
        roomState: null,
        selectedKey: null,
        savedRoom,
        pendingJoinSource: null,
        lastRoundEnd: null,
        standings: [],
        matchInProgress: false,
        errorMessage: message,
        notification: message ? { kind: "error", message } : null,
      };
    }

    case "socketDisconnected": {
      const currentPlayer = state.roomState?.players.find((player) => player.id === state.myPlayerId);
      const savedRoom = state.savedRoom.roomCode && state.savedRoom.playerName ? state.savedRoom : {
        ...state.savedRoom,
        roomCode: state.roomState?.room || state.savedRoom.roomCode,
        playerName: currentPlayer?.name || state.savedRoom.playerName,
      };
      const canReconnect = Boolean(savedRoom.roomCode && savedRoom.playerName && state.autoReconnectEnabled);
      const message = canReconnect ? REJOIN_AVAILABLE_MESSAGE : REJOIN_UNAVAILABLE_MESSAGE;
      return {
        ...state,
        view: canReconnect ? "reconnect_prompt" : "join",
        matchPhase: "idle",
        myPlayerId: null,
        isHost: false,
        roomState: null,
        selectedKey: null,
        savedRoom,
        pendingJoinSource: null,
        lastRoundEnd: null,
        standings: [],
        countdownRemaining: null,
        matchInProgress: false,
        errorMessage: message,
        notification: { kind: "error", message },
      };
    }

    case "error":
      if (state.pendingJoinSource === "auto" && action.payload.message === "Room not found.") {
        return {
          ...state,
          view: "join",
          pendingJoinSource: null,
          savedRoom: clearSavedRoom(state.savedRoom),
          errorMessage: null,
        };
      }
      return { ...state, pendingJoinSource: null, errorMessage: action.payload.message, notification: { kind: "error", message: action.payload.message } };

    default:
      return state;
  }
}

function clearSavedRoom(savedRoom: OnlineSavedRoomState, clearPlayerName = false): OnlineSavedRoomState {
  return {
    roomCode: "",
    playerName: clearPlayerName ? "" : savedRoom.playerName,
    hostReclaimToken: "",
  };
}

function getViewForRoomState(room: OnlineRoomState, playerId: string, lastRoundEnd: OnlineRoundSummary | null): OnlineView {
  if (room.status === "waiting_for_players" || room.status === "ready_check") return "lobby";
  if (room.status === "post_match") {
    const currentPlayer = room.players.find((player) => player.id === playerId);
    return currentPlayer?.isInLobbyView || room.players.length <= 1 ? "lobby" : "post_match";
  }
  if (room.status === "roundEnd" && lastRoundEnd) return "round_end";
  if (room.status === "gameOver") return "game_over";
  return isMatchStatus(room.status) ? "match" : "lobby";
}

function getMatchPhaseForRoom(status: OnlineRoomState["status"]): OnlineMatchPhase {
  if (status === "countdown" || status === "waiting" || status === "react") return status;
  if (status === "roundEnd") return "round_end";
  if (status === "gameOver") return "game_over";
  return "idle";
}

function isMatchStatus(status: OnlineRoomState["status"]): boolean {
  return status === "starting" || status === "countdown" || status === "waiting" || status === "react" || status === "roundEnd";
}

function updateCurrentPlayerTheme(state: OnlineClientState, themeCommand?: string, color?: string): OnlineClientState {
  if (!state.roomState || !state.myPlayerId || !themeCommand) return state;

  return {
    ...state,
    roomState: {
      ...state.roomState,
      players: state.roomState.players.map((player) => {
        if (player.id !== state.myPlayerId) return player;
        return { ...player, themeCommand, color: color || player.color };
      }),
    },
  };
}
