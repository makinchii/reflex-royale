const assert = require("assert/strict");
const path = require("path");
const test = require("node:test");
const ts = require("typescript");

const reducerPath = path.join(__dirname, "..", "src", "lib", "online", "client-reducer.ts");
const contractPath = path.join(__dirname, "..", "src", "lib", "online", "client-contract.ts");

function loadOnlineReducer() {
  const originalTsExtension = require.extensions[".ts"];

  require.extensions[".ts"] = (module, filename) => {
    const source = require("fs").readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    module._compile(output, filename);
  };

  delete require.cache[reducerPath];
  delete require.cache[contractPath];
  const exports = require(reducerPath);

  if (originalTsExtension) {
    require.extensions[".ts"] = originalTsExtension;
  } else {
    delete require.extensions[".ts"];
  }

  return exports;
}

function player(overrides = {}) {
  return {
    id: "p1",
    name: "Ada",
    color: "#00d4ff",
    themeCommand: "tron",
    connected: true,
    isReady: false,
    isHost: false,
    keySet: false,
    hasKeyBinding: false,
    keyBinding: null,
    isInLobbyView: true,
    lastSeenAt: 1,
    joinedAt: 1,
    ...overrides,
  };
}

function standing(overrides = {}) {
  return {
    id: "p1",
    name: "Ada",
    color: "#00d4ff",
    themeCommand: "tron",
    totalScore: 3,
    wins: 1,
    bestTime: 210,
    avgTime: 230,
    falseStarts: 0,
    roundTimes: [230],
    ...overrides,
  };
}

function room(overrides = {}) {
  const players = overrides.players || [player({ isHost: true })];
  return {
    room: "ABCD12",
    status: "waiting_for_players",
    hostId: players[0]?.id || null,
    currentRound: 0,
    totalRounds: 5,
    targetScore: 10,
    canStart: false,
    playerCount: players.length,
    readyCount: players.filter((p) => p.isReady).length,
    waitingFor: [],
    standings: players.map((p) => standing({ id: p.id, name: p.name, color: p.color, themeCommand: p.themeCommand })),
    roundHistory: [],
    chatMessages: [],
    players,
    ...overrides,
  };
}

test("checks a saved room, prompts when valid, and clears stale saved rooms", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState({ roomCode: "ABCD12", playerName: "Ada", verifier: "v1" });

  assert.equal(state.view, "checking_saved_room");

  state = onlineClientReducer(state, { type: "savedRoomChecked", payload: { room: "ZZZZ99", valid: true } });
  assert.equal(state.view, "checking_saved_room");

  state = onlineClientReducer(state, { type: "savedRoomChecked", payload: { room: "ABCD12", valid: true } });
  assert.equal(state.view, "reconnect_prompt");

  state = onlineClientReducer(state, { type: "joinSavedRoomRequested" });
  assert.equal(state.pendingJoinSource, "auto");

  state = onlineClientReducer(state, { type: "error", payload: { message: "Room not found." } });
  assert.equal(state.view, "join");
  assert.equal(state.savedRoom.roomCode, "");
  assert.equal(state.savedRoom.hostReclaimToken, "");
  assert.equal(state.savedRoom.playerName, "Ada");
});

test("tracks create and join success like remote socket handlers", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  const createdRoom = room({ players: [player({ id: "host", name: "Host", isHost: true })], hostId: "host" });
  let state = createInitialOnlineClientState();

  state = onlineClientReducer(state, {
    type: "roomCreated",
    payload: { room: createdRoom, playerId: "host", verifier: "created-verifier", hostReclaimToken: "host-token" },
  });

  assert.equal(state.view, "lobby");
  assert.equal(state.myPlayerId, "host");
  assert.equal(state.isHost, true);
  assert.equal(state.verifier, "created-verifier");
  assert.deepEqual(state.savedRoom, { roomCode: "ABCD12", playerName: "Host", hostReclaimToken: "host-token" });

  const joinedRoom = room({
    players: [player({ id: "host", name: "Host", isHost: true }), player({ id: "p2", name: "Bea", joinedAt: 2 })],
    hostId: "host",
  });
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: joinedRoom, playerId: "p2", hostReclaimToken: "host-token" },
  });

  assert.equal(state.myPlayerId, "p2");
  assert.equal(state.isHost, false);
  assert.equal(state.savedRoom.playerName, "Bea");
  assert.equal(state.roomState.players.length, 2);
});

test("uses server-assigned key bindings as the active online key", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState();

  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: {
      room: room({ players: [player({ id: "p1", keyBinding: "q", hasKeyBinding: true })], hostId: "p1" }),
      playerId: "p1",
    },
  });

  assert.equal(state.selectedKey, "q");

  state = onlineClientReducer(state, {
    type: "roomState",
    payload: room({ players: [player({ id: "p1", keyBinding: "w", hasKeyBinding: true })], hostId: "p1" }),
  });

  assert.equal(state.selectedKey, "w");
});

test("keeps socket errors visible outside the join screen", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState();
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room(), playerId: "p1" },
  });

  state = onlineClientReducer(state, { type: "error", payload: { message: "That key is already in use." } });

  assert.equal(state.view, "lobby");
  assert.equal(state.errorMessage, "That key is already in use.");
  assert.deepEqual(state.notification, { kind: "error", message: "That key is already in use." });
});

test("moves disconnected players out of stale room views and into reconnect", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState({ roomCode: "ABCD12", playerName: "Ada", verifier: "v1" });
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room({ status: "react" }), playerId: "p1", hostReclaimToken: "host-token" },
  });

  state = onlineClientReducer(state, { type: "socketDisconnected", payload: { message: "Connection lost. Reconnect to your saved room?" } });

  assert.equal(state.view, "reconnect_prompt");
  assert.equal(state.matchPhase, "idle");
  assert.equal(state.myPlayerId, null);
  assert.equal(state.roomState, null);
  assert.equal(state.selectedKey, null);
  assert.equal(state.matchInProgress, false);
  assert.equal(state.savedRoom.roomCode, "ABCD12");
  assert.equal(state.savedRoom.playerName, "Ada");
  assert.equal(state.notification.message, "Connection lost. Attempt rejoin or join a different room?");

  state = onlineClientReducer(state, { type: "savedRoomDeclined" });

  assert.equal(state.view, "join");
  assert.equal(state.notification, null);
  assert.equal(state.errorMessage, null);
});

test("falls back to join screen on disconnect without a saved room", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  const state = onlineClientReducer(createInitialOnlineClientState(), { type: "socketDisconnected" });

  assert.equal(state.view, "join");
  assert.equal(state.roomState, null);
  assert.equal(state.matchInProgress, false);
  assert.equal(state.notification.message, "Unable to rejoin room. You must join a different room.");
});

test("uses current room identity for reconnect when saved room storage is missing", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState();
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room({ players: [player({ id: "p1", name: "Ada" })], hostId: "p1" }), playerId: "p1", hostReclaimToken: "host-token" },
  });
  state = { ...state, savedRoom: { roomCode: "", playerName: "", hostReclaimToken: "host-token" } };

  state = onlineClientReducer(state, { type: "socketDisconnected" });

  assert.equal(state.view, "reconnect_prompt");
  assert.deepEqual(state.savedRoom, { roomCode: "ABCD12", playerName: "Ada", hostReclaimToken: "host-token" });
  assert.equal(state.notification.message, "Connection lost. Attempt rejoin or join a different room?");
});

test("keeps stale room identity so players can attempt rejoin", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState({ roomCode: "ABCD12", playerName: "Ada", hostReclaimToken: "host-token" });
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room(), playerId: "p1", hostReclaimToken: "host-token" },
  });

  state = onlineClientReducer(state, { type: "roomClosed", payload: { room: "ABCD12", reason: "stale", message: "Room connection is stale. Rejoin to continue." } });

  assert.equal(state.view, "reconnect_prompt");
  assert.deepEqual(state.savedRoom, { roomCode: "ABCD12", playerName: "Ada", hostReclaimToken: "host-token" });
  assert.equal(state.notification.message, "Connection lost. Attempt rejoin or join a different room?");
});

test("moves between lobby and post-match views from roomState", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState();
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: {
      room: room({ players: [player({ id: "p1", isHost: true }), player({ id: "p2", name: "Bea", joinedAt: 2 })], hostId: "p1" }),
      playerId: "p2",
    },
  });

  state = onlineClientReducer(state, {
    type: "roomState",
    payload: room({
      status: "post_match",
      players: [player({ id: "p1", isHost: true }), player({ id: "p2", name: "Bea", joinedAt: 2, isInLobbyView: false })],
      hostId: "p1",
      waitingFor: ["Bea"],
    }),
  });
  assert.equal(state.view, "post_match");

  state = onlineClientReducer(state, {
    type: "roomState",
    payload: room({
      status: "post_match",
      players: [player({ id: "p1", isHost: true }), player({ id: "p2", name: "Bea", joinedAt: 2, isInLobbyView: true })],
      hostId: "p1",
    }),
  });
  assert.equal(state.view, "lobby");
});

test("clears identity and saved room details when removed or closed", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState({ roomCode: "ABCD12", playerName: "Ada", hostReclaimToken: "host-token" });
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room(), playerId: "p1", hostReclaimToken: "host-token" },
  });

  state = onlineClientReducer(state, { type: "removedFromLobby", payload: { room: "ABCD12", reason: "kicked" } });
  assert.equal(state.view, "join");
  assert.equal(state.myPlayerId, null);
  assert.equal(state.autoReconnectEnabled, false);
  assert.deepEqual(state.savedRoom, { roomCode: "", playerName: "", hostReclaimToken: "" });
  assert.equal(state.notification.message, "You were kicked from the lobby.");

  state = createInitialOnlineClientState({ roomCode: "ABCD12", playerName: "Ada", hostReclaimToken: "host-token" });
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room(), playerId: "p1", hostReclaimToken: "host-token" },
  });
  state = onlineClientReducer(state, { type: "roomClosed", payload: { room: "ABCD12", reason: "empty" } });
  assert.deepEqual(state.savedRoom, { roomCode: "", playerName: "Ada", hostReclaimToken: "" });

  state = onlineClientReducer(state, { type: "roomClosed", payload: { room: "ABCD12", reason: "host_closed" } });
  assert.deepEqual(state.savedRoom, { roomCode: "", playerName: "", hostReclaimToken: "" });
});

test("progresses through authoritative match states", () => {
  const { createInitialOnlineClientState, onlineClientReducer } = loadOnlineReducer();
  let state = createInitialOnlineClientState();
  state = onlineClientReducer(state, {
    type: "roomJoined",
    payload: { room: room({ players: [player({ id: "p1", isHost: true }), player({ id: "p2", name: "Bea", joinedAt: 2 })] }), playerId: "p1" },
  });

  state = onlineClientReducer(state, { type: "countdown", payload: { remaining: 3 } });
  assert.equal(state.view, "match");
  assert.equal(state.matchPhase, "countdown");
  assert.equal(state.countdownRemaining, 3);
  assert.equal(state.matchInProgress, true);

  state = onlineClientReducer(state, { type: "waiting" });
  assert.equal(state.matchPhase, "waiting");
  assert.equal(state.countdownRemaining, null);

  state = onlineClientReducer(state, { type: "react" });
  assert.equal(state.matchPhase, "react");

  const roundSummary = {
    roundNum: 1,
    results: [
      { id: "p1", name: "Ada", time: 210, falseStart: false, missed: false, disconnected: false, outcome: "valid", points: 2 },
    ],
  };
  state = onlineClientReducer(state, { type: "roundEnd", payload: roundSummary });
  assert.equal(state.view, "round_end");
  assert.equal(state.lastRoundEnd, roundSummary);

  const standings = [standing({ id: "p1", name: "Ada" }), standing({ id: "p2", name: "Bea", totalScore: 1, wins: 0 })];
  state = onlineClientReducer(state, { type: "gameOver", payload: { standings } });
  assert.equal(state.view, "game_over");
  assert.equal(state.matchPhase, "game_over");
  assert.equal(state.matchInProgress, false);
  assert.deepEqual(state.standings, standings);
});
