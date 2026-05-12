const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const test = require("node:test");

const authRoutePath = path.join(__dirname, "..", "routes", "auth.js");
const leaderboardRoutePath = path.join(__dirname, "..", "routes", "leaderboard.js");
const sessionAuthPath = path.join(__dirname, "..", "lib", "sessionAuth.js");
const themePreferencesPath = path.join(__dirname, "..", "lib", "themePreferences.js");
const userModelPath = path.join(__dirname, "..", "models", "User.js");
const gameRoomPath = path.join(__dirname, "..", "sockets", "gameRoom.js");
const pickerPath = path.join(__dirname, "..", "src", "components", "thegridcn", "hex-color-picker.tsx");

function createUserModel(initialUsers = []) {
  const users = initialUsers.map((user) => ({ ...user }));

  class User {
    constructor(doc) {
      this._id = doc._id || crypto.randomUUID();
      this.username = doc.username;
      this.password = doc.password;
      this.bestScore = doc.bestScore || 0;
      this.bestWinStreak = doc.bestWinStreak || 0;
      this.currentWinStreak = doc.currentWinStreak || 0;
      this.falseStarts = doc.falseStarts || 0;
      this.gamesPlayed = doc.gamesPlayed || 0;
      this.preferredThemeCommand = doc.preferredThemeCommand || "tron";
      this.preferredThemeColor = doc.preferredThemeColor || "#00d4ff";
      this.preferredThemeShades = doc.preferredThemeShades || {};
      this.reactions = doc.reactions || 0;
      this.recentMatches = doc.recentMatches ? doc.recentMatches.map((match) => ({ ...match })) : [];
      this.timeSpentPlayingSeconds = doc.timeSpentPlayingSeconds || 0;
      this.totalReactionTime = doc.totalReactionTime || 0;
      this.wins = doc.wins || 0;
      this.lastLoginAt = doc.lastLoginAt ?? null;
    }

    async save() {
      const index = users.findIndex((user) => user._id === this._id);
      const snapshot = {
        _id: this._id,
        username: this.username,
        password: this.password,
        bestScore: this.bestScore,
        bestWinStreak: this.bestWinStreak,
        currentWinStreak: this.currentWinStreak,
        falseStarts: this.falseStarts,
        gamesPlayed: this.gamesPlayed,
        preferredThemeCommand: this.preferredThemeCommand,
        preferredThemeColor: this.preferredThemeColor,
        preferredThemeShades: this.preferredThemeShades,
        reactions: this.reactions,
        recentMatches: this.recentMatches ? this.recentMatches.map((match) => ({ ...match })) : [],
        timeSpentPlayingSeconds: this.timeSpentPlayingSeconds,
        totalReactionTime: this.totalReactionTime,
        wins: this.wins,
        lastLoginAt: this.lastLoginAt
      };

      if (index >= 0) {
        users[index] = snapshot;
      } else {
        users.push(snapshot);
      }

      return this;
    }

    static async findOne(query) {
      const found = users.find((user) => Object.entries(query).every(([key, value]) => user[key] === value));
      if (!found) return null;

      return new User(found);
    }

    static async findById(id) {
      const found = users.find((user) => user._id === id);
      if (!found) return null;

      return new User(found);
    }
  }

  return { User, users };
}

function loadLeaderboardRouter(initialUsers = []) {
  const mongoose = require("mongoose");
  const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: 1
  });

  delete require.cache[leaderboardRoutePath];
  delete require.cache[sessionAuthPath];
  delete require.cache[userModelPath];

  const { User, users } = createUserModel(initialUsers);
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: User
  };

  const router = require(leaderboardRoutePath);

  return {
    router,
    users,
    restore() {
      delete require.cache[leaderboardRoutePath];
      delete require.cache[sessionAuthPath];
      delete require.cache[userModelPath];
      if (originalDescriptor) {
        Object.defineProperty(mongoose.connection, "readyState", originalDescriptor);
      }
    }
  };
}

function createSession() {
  return {
    user: null,
    regenerate(callback) {
      callback.call(this, null);
    },
    destroy(callback) {
      callback.call(this, null);
    }
  };
}

function loadAuthRouter(initialUsers = []) {
  const mongoose = require("mongoose");
  const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: 1
  });

  delete require.cache[authRoutePath];
  delete require.cache[sessionAuthPath];
  delete require.cache[userModelPath];

  const { User, users } = createUserModel(initialUsers);
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: User
  };

  const router = require(authRoutePath);

  return {
    router,
    users,
    restore() {
      delete require.cache[authRoutePath];
      delete require.cache[sessionAuthPath];
      delete require.cache[userModelPath];
      if (originalDescriptor) {
        Object.defineProperty(mongoose.connection, "readyState", originalDescriptor);
      }
    }
  };
}

function getRouteHandler(router, method, routePath) {
  const layer = router.stack.find((entry) => entry.route && entry.route.path === routePath && entry.route.methods[method]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`);
  }

  const handlers = layer.route.stack.map((entry) => entry.handle);
  return async (req, res) => {
    let index = 0;
    const next = async () => {
      const handler = handlers[index];
      index += 1;
      if (handler) await handler(req, res, next);
    };

    await next();
  };
}

async function invokeRoute(handler, { body = {}, session = null } = {}) {
  const req = {
    body,
    session: session || createSession()
  };

  const res = {
    statusCode: 200,
    payload: null,
    clearedCookie: null,
    redirectedTo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    clearCookie(name) {
      this.clearedCookie = name;
    },
    redirect(url) {
      this.redirectedTo = url;
      return this;
    }
  };

  await handler(req, res);
  return { req, res };
}

function patchNoopTimers() {
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  let nextId = 1;

  global.setInterval = () => nextId++;
  global.clearInterval = () => {};
  global.setTimeout = () => nextId++;
  global.clearTimeout = () => {};

  return () => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  };
}

class FakeSocket {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.handlers = new Map();
    this.rooms = new Set();
    this.emitted = [];
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  emit(event, payload) {
    this.emitted.push({ event, payload });
  }

  trigger(event, payload) {
    const handler = this.handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(payload);
  }

  join(room) {
    this.rooms.add(room);
  }

  leave(room) {
    this.rooms.delete(room);
  }
}

class FakeIO {
  constructor() {
    this.connectionHandler = null;
    this.sockets = { sockets: new Map() };
    this.roomEmits = [];
  }

  on(event, handler) {
    if (event === "connection") {
      this.connectionHandler = handler;
    }
  }

  connect(socket) {
    this.sockets.sockets.set(socket.id, socket);
    this.connectionHandler(socket);
  }

  to(room) {
    return {
      emit: (event, payload) => {
        this.roomEmits.push({ room, event, payload });
        for (const socket of this.sockets.sockets.values()) {
          if (socket.rooms.has(room)) {
            socket.emitted.push({ event, payload });
          }
        }
      }
    };
  }
}

function lastEvent(socket, event) {
  const matches = [...socket.emitted].filter((entry) => entry.event === event);
  return matches[matches.length - 1] || null;
}

test("auth signup login and logout work end-to-end", async () => {
  const { router, users, restore } = loadAuthRouter();

  try {
    const signup = getRouteHandler(router, "post", "/signup");
    const login = getRouteHandler(router, "post", "/login");
    const logout = getRouteHandler(router, "post", "/logout");
    const updateTheme = getRouteHandler(router, "post", "/theme");

    const signupResult = await invokeRoute(signup, { body: { username: "Ada", password: "secret123" } });
    assert.equal(signupResult.res.statusCode, 201);
    assert.equal(signupResult.res.payload.success, true);
    assert.equal(signupResult.req.session.user.username, "Ada");
    assert.equal(users.length, 1);

    const loginResult = await invokeRoute(login, { body: { username: "Ada", password: "secret123" } });
    assert.equal(loginResult.res.statusCode, 200);
    assert.equal(loginResult.res.payload.success, true);
    assert.equal(loginResult.req.session.user.username, "Ada");
    assert.ok(users[0].lastLoginAt instanceof Date);

    const themeResult = await invokeRoute(updateTheme, {
      session: loginResult.req.session,
      body: { preferredThemeCommand: "gaia", preferredThemeColor: "#24f07a" }
    });
    assert.equal(themeResult.res.statusCode, 200);
    assert.equal(themeResult.res.payload.user.preferredThemeCommand, "gaia");
    assert.equal(themeResult.req.session.user.preferredThemeCommand, "gaia");
    assert.equal(users[0].preferredThemeCommand, "gaia");
    assert.equal(themeResult.res.payload.user.preferredThemeShades.gaia, "#24f07a");

    const logoutResult = await invokeRoute(logout, { session: loginResult.req.session });
    assert.equal(logoutResult.res.payload.success, true);
    assert.equal(logoutResult.res.clearedCookie, "connect.sid");
  } finally {
    restore();
  }
});

test("auth rejects duplicate usernames", async () => {
  const { router, restore } = loadAuthRouter([{ _id: "u1", username: "Ada", password: "hashed" }]);

  try {
    const signup = getRouteHandler(router, "post", "/signup");
    const result = await invokeRoute(signup, { body: { username: "Ada", password: "secret123" } });
    assert.equal(result.res.statusCode, 409);
    assert.equal(result.res.payload.success, false);
  } finally {
    restore();
  }
});

test("auth theme route enforces strict protocol shade ownership", async () => {
  const { router, restore } = loadAuthRouter([{ _id: "u1", username: "Ada", password: "hashed" }]);

  try {
    const updateTheme = getRouteHandler(router, "post", "/theme");
    const session = { user: { id: "u1", username: "Ada" } };

    const olympus = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "olympus", preferredThemeColor: "#FFFFFF" }
    });
    assert.equal(olympus.res.statusCode, 200);

    const nearWhite = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "olympus", preferredThemeColor: "#FFCCFF" }
    });
    assert.equal(nearWhite.res.statusCode, 400);

    const bacchusBlue = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "bacchus", preferredThemeColor: "#3366FF" }
    });
    assert.equal(bacchusBlue.res.statusCode, 400);

    const tronBlue = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "tron", preferredThemeColor: "#3366FF" }
    });
    assert.equal(tronBlue.res.statusCode, 200);

    const tronPurple = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "tron", preferredThemeColor: "#9933FF" }
    });
    assert.equal(tronPurple.res.statusCode, 400);

    const savedShades = await invokeRoute(updateTheme, {
      session,
      body: {
        preferredThemeCommand: "ares",
        preferredThemeColor: "#FF0000",
        preferredThemeShades: {
          ares: "#FF0000",
          tron: "#3366FF",
          olympus: "#FFFFFF",
          bacchus: "#3366FF"
        }
      }
    });
    assert.equal(savedShades.res.statusCode, 200);
    assert.equal(savedShades.res.payload.user.preferredThemeShades.ares, "#FF0000");
    assert.equal(savedShades.res.payload.user.preferredThemeShades.tron, "#3366FF");
    assert.equal(savedShades.res.payload.user.preferredThemeShades.olympus, "#FFFFFF");
    assert.equal(savedShades.res.payload.user.preferredThemeShades.bacchus, "#8a2bff");

    const boundaryAres = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "ares", preferredThemeColor: "#FF9999" }
    });
    assert.equal(boundaryAres.res.statusCode, 200);

    const boundaryAphrodite = await invokeRoute(updateTheme, {
      session,
      body: { preferredThemeCommand: "aphrodite", preferredThemeColor: "#FF6699" }
    });
    assert.equal(boundaryAphrodite.res.statusCode, 200);
  } finally {
    restore();
  }
});

test("every hex picker color has exactly one theme owner", () => {
  delete require.cache[themePreferencesPath];
  const { THEME_SHADE_COLORS, getThemeOwnerForColor } = require(themePreferencesPath);
  const pickerSource = require("fs").readFileSync(pickerPath, "utf8");
  const pickerColors = [...new Set([...pickerSource.matchAll(/#[0-9A-Fa-f]{6}/g)].map((match) => match[0]))];

  assert.ok(pickerColors.length > 0);
  for (const color of pickerColors) {
    const owners = Object.entries(THEME_SHADE_COLORS).filter(([, shades]) => shades.some((shade) => shade.toLowerCase() === color.toLowerCase()));
    assert.equal(owners.length, 1, `${color} should have one owner`);
    assert.equal(getThemeOwnerForColor(color), owners[0][0]);
  }
});

test("record match stores the five most recent matches", async () => {
  const { router, users, restore } = loadLeaderboardRouter([{ _id: "u1", username: "Ada", password: "hashed", recentMatches: [] }]);

  try {
    const recordMatch = getRouteHandler(router, "post", "/record-match");
    const session = { user: { id: "u1", username: "Ada" } };

    for (let index = 1; index <= 6; index += 1) {
      const result = await invokeRoute(recordMatch, {
        session,
        body: {
          mode: "online",
          place: index,
          averageReactionTime: 200 + index,
          falseStarts: 1,
          matchDurationSeconds: 30,
          reactions: 2,
          totalReactionTime: 400 + index
        }
      });

      assert.equal(result.res.statusCode, 200);
      assert.equal(result.res.payload.success, true);
    }

    assert.equal(users[0].recentMatches.length, 5);
    assert.equal(users[0].recentMatches[0].place, 6);
    assert.equal(users[0].recentMatches[0].averageReactionTime, 206);
    assert.equal(users[0].recentMatches[4].place, 2);
    assert.equal(users[0].gamesPlayed, 6);
    assert.equal(users[0].wins, 1);
    assert.equal(users[0].currentWinStreak, 0);
    assert.equal(users[0].bestWinStreak, 1);
    assert.equal(users[0].falseStarts, 6);
    assert.equal(users[0].reactions, 12);
    assert.equal(users[0].timeSpentPlayingSeconds, 180);
    assert.equal(users[0].totalReactionTime, 2421);
  } finally {
    restore();
  }
});

test("lobby join, chat, kick, blacklist, and host transfer work", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-1", io);
    io.connect(host);
    host.trigger("createRoom", { name: "Host", totalRounds: 7 });

    const created = lastEvent(host, "roomCreated");
    assert.ok(created);
    assert.equal(created.payload.room.totalRounds, 7);
    const roomCode = created.payload.room.room;
    const hostVerifier = created.payload.verifier;
    const hostToken = created.payload.hostReclaimToken;

    const player = new FakeSocket("player-1", io);
    io.connect(player);
    player.trigger("joinRoom", { name: "Player", room: roomCode, verifier: "ver-player" });

    assert.ok(lastEvent(player, "roomJoined"));
    player.trigger("bindKey", { key: "!" });
    const bound = lastEvent(player, "keyBound");
    assert.equal(bound.payload.key, "1");

    player.trigger("bindKey", { key: "Enter" });
    const invalidKey = lastEvent(player, "error");
    assert.equal(invalidKey.payload.message, "Pick a displayed keyboard key.");

    host.trigger("sendChatMessage", { content: "Welcome" });
    const chat = lastEvent(player, "chatMessage");
    assert.equal(chat.payload.messages.at(-1).content, "Welcome");

    host.trigger("removePlayer", { playerId: "player-1" });
    const kicked = lastEvent(player, "removedFromLobby");
    assert.equal(kicked.payload.reason, "kicked");
    assert.equal(player.rooms.has(roomCode), false);

    player.trigger("joinRoom", { name: "Player", room: roomCode, verifier: "ver-player" });
    const blocked = lastEvent(player, "error");
    assert.equal(blocked.payload.message, "You were kicked from this lobby and cannot rejoin it.");

    const nextHost = new FakeSocket("player-2", io);
    io.connect(nextHost);
    nextHost.trigger("joinRoom", { name: "NextHost", room: roomCode, verifier: "ver-next-host" });
    assert.ok(lastEvent(nextHost, "roomJoined"));

    const hostReload = new FakeSocket("host-2", io);
    io.connect(hostReload);
    host.trigger("disconnect");
    hostReload.trigger("joinRoom", { name: "Host", room: roomCode, verifier: hostVerifier, hostReclaimToken: hostToken });
    const reclaimed = lastEvent(hostReload, "roomJoined");
    assert.ok(reclaimed);
    assert.equal(reclaimed.payload.room.hostId, "player-2");
    assert.equal(reclaimed.payload.room.players.find((entry) => entry.id === "host-2")?.isHost, false);
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});

test("lobby disconnect removes players and transfers host without ghost slots", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-1", io);
    io.connect(host);
    host.trigger("createRoom", { name: "Host" });
    const roomCode = lastEvent(host, "roomCreated").payload.room.room;

    const player = new FakeSocket("player-1", io);
    io.connect(player);
    player.trigger("joinRoom", { name: "Player", room: roomCode, verifier: "ver-player" });
    assert.equal(lastEvent(host, "roomState").payload.players.length, 2);

    player.trigger("disconnect");
    const afterPlayerDisconnect = lastEvent(host, "roomState").payload;
    assert.deepEqual(afterPlayerDisconnect.players.map((entry) => entry.id), ["host-1"]);
    assert.equal(afterPlayerDisconnect.hostId, "host-1");

    const nextHost = new FakeSocket("player-2", io);
    io.connect(nextHost);
    nextHost.trigger("joinRoom", { name: "NextHost", room: roomCode, verifier: "ver-next-host" });

    host.trigger("disconnect");
    const afterHostDisconnect = lastEvent(nextHost, "roomState").payload;
    assert.deepEqual(afterHostDisconnect.players.map((entry) => entry.id), ["player-2"]);
    assert.equal(afterHostDisconnect.hostId, "player-2");
    assert.equal(afterHostDisconnect.players[0].isHost, true);
    const hostTransferChat = lastEvent(nextHost, "chatMessage").payload.messages.at(-1);
    assert.equal(hostTransferChat.senderName, "NextHost");
    assert.equal(hostTransferChat.content, "is now the host.");
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});

test("active match host disconnect transfers host when enough players remain", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-1", io);
    const playerOne = new FakeSocket("player-1", io);
    const playerTwo = new FakeSocket("player-2", io);
    io.connect(host);
    io.connect(playerOne);
    io.connect(playerTwo);

    host.trigger("createRoom", { name: "Host" });
    const roomCode = lastEvent(host, "roomCreated").payload.room.room;
    playerOne.trigger("joinRoom", { name: "PlayerOne", room: roomCode, verifier: "ver-player-1" });
    playerTwo.trigger("joinRoom", { name: "PlayerTwo", room: roomCode, verifier: "ver-player-2" });

    host.trigger("bindKey", { key: "1" });
    playerOne.trigger("bindKey", { key: "2" });
    playerTwo.trigger("bindKey", { key: "3" });
    host.trigger("toggleReady");
    playerOne.trigger("toggleReady");
    playerTwo.trigger("toggleReady");
    host.trigger("startGame");

    host.trigger("disconnect");
    const state = lastEvent(playerOne, "roomState").payload;
    assert.equal(state.status, "starting");
    assert.equal(state.hostId, "player-1");
    assert.equal(state.players.find((entry) => entry.id === "player-1")?.isHost, true);
    const hostTransferChat = lastEvent(playerOne, "chatMessage").payload.messages.at(-1);
    assert.equal(hostTransferChat.senderName, "PlayerOne");
    assert.equal(hostTransferChat.content, "is now the host.");
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});

test("active match returns lone remaining player to lobby after host disconnect", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-1", io);
    const player = new FakeSocket("player-1", io);
    io.connect(host);
    io.connect(player);

    host.trigger("createRoom", { name: "Host" });
    const roomCode = lastEvent(host, "roomCreated").payload.room.room;
    player.trigger("joinRoom", { name: "Player", room: roomCode, verifier: "ver-player" });

    host.trigger("bindKey", { key: "1" });
    player.trigger("bindKey", { key: "2" });
    host.trigger("toggleReady");
    player.trigger("toggleReady");
    host.trigger("startGame");

    host.trigger("disconnect");
    const state = lastEvent(player, "roomState").payload;
    assert.equal(state.status, "waiting_for_players");
    assert.deepEqual(state.players.map((entry) => entry.id), ["player-1"]);
    assert.equal(state.hostId, "player-1");
    assert.equal(state.players[0].isHost, true);
    assert.equal(state.players[0].isInLobbyView, true);
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});

test("online lobbies auto-select preferred keys by join precedence", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-pref", io);
    io.connect(host);
    host.trigger("createRoom", { name: "Host", preferredKey: "!" });

    const created = lastEvent(host, "roomCreated");
    assert.equal(created.payload.room.players.find((player) => player.id === "host-pref").keyBinding, "1");

    const roomCode = created.payload.room.room;

    const blockedPlayer = new FakeSocket("player-pref-blocked", io);
    io.connect(blockedPlayer);
    blockedPlayer.trigger("joinRoom", { name: "Blocked", room: roomCode, verifier: "ver-blocked", preferredKey: "1" });

    const blockedJoin = lastEvent(blockedPlayer, "roomJoined");
    assert.equal(blockedJoin.payload.room.players.find((player) => player.id === "player-pref-blocked").keyBinding, null);

    const freePlayer = new FakeSocket("player-pref-free", io);
    io.connect(freePlayer);
    freePlayer.trigger("joinRoom", { name: "Free", room: roomCode, verifier: "ver-free", preferredKey: "Q" });

    const freeJoin = lastEvent(freePlayer, "roomJoined");
    assert.equal(freeJoin.payload.room.players.find((player) => player.id === "player-pref-free").keyBinding, "q");
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});

test("online lobbies auto-select preferred themes and report unavailable preferences", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-theme", io);
    io.connect(host);
    host.trigger("createRoom", { name: "Host", preferredKey: "a", preferredThemeCommand: "tron", preferredThemeColor: "#3366FF" });

    const created = lastEvent(host, "roomCreated");
    const hostPlayer = created.payload.room.players.find((player) => player.id === "host-theme");
    assert.equal(hostPlayer.keyBinding, "a");
    assert.equal(hostPlayer.themeCommand, "tron");
    assert.equal(hostPlayer.color, "#3366FF");

    const roomCode = created.payload.room.room;

    const blocked = new FakeSocket("player-theme-blocked", io);
    io.connect(blocked);
    blocked.trigger("joinRoom", { name: "Blocked", room: roomCode, verifier: "ver-theme-blocked", preferredKey: "a", preferredThemeCommand: "tron", preferredThemeColor: "#00d4ff" });

    const blockedJoin = lastEvent(blocked, "roomJoined");
    const blockedPlayer = blockedJoin.payload.room.players.find((player) => player.id === "player-theme-blocked");
    assert.equal(blockedPlayer.keyBinding, null);
    assert.equal(blockedPlayer.themeCommand, null);
    assert.equal(blockedPlayer.color, "#3498db");

    const blockedWarning = lastEvent(blocked, "preferenceConflict");
    assert.deepEqual(blockedWarning.payload.unavailable.sort(), ["key", "theme"]);

    const free = new FakeSocket("player-theme-free", io);
    io.connect(free);
    free.trigger("joinRoom", { name: "Free", room: roomCode, verifier: "ver-theme-free", preferredKey: "q", preferredThemeCommand: "gaia", preferredThemeColor: "#66FF99" });

    const freeJoin = lastEvent(free, "roomJoined");
    const freePlayer = freeJoin.payload.room.players.find((player) => player.id === "player-theme-free");
    assert.equal(freePlayer.keyBinding, "q");
    assert.equal(freePlayer.themeCommand, "gaia");
    assert.equal(freePlayer.color, "#66FF99");
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});
