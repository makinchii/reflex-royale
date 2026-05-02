const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const test = require("node:test");

const authRoutePath = path.join(__dirname, "..", "routes", "auth.js");
const leaderboardRoutePath = path.join(__dirname, "..", "routes", "leaderboard.js");
const sessionAuthPath = path.join(__dirname, "..", "lib", "sessionAuth.js");
const userModelPath = path.join(__dirname, "..", "models", "User.js");
const gameRoomPath = path.join(__dirname, "..", "sockets", "gameRoom.js");

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
  let nextId = 1;

  global.setInterval = () => nextId++;
  global.clearInterval = () => {};

  return () => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
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

test("lobby join, chat, kick, blacklist, and host reclaim work", async () => {
  const restoreTimers = patchNoopTimers();
  delete require.cache[gameRoomPath];
  const { initGameSockets } = require(gameRoomPath);
  const io = new FakeIO();

  try {
    initGameSockets(io);

    const host = new FakeSocket("host-1", io);
    io.connect(host);
    host.trigger("createRoom", { name: "Host" });

    const created = lastEvent(host, "roomCreated");
    assert.ok(created);
    const roomCode = created.payload.room.room;
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

    const hostReload = new FakeSocket("host-2", io);
    io.connect(hostReload);
    host.trigger("disconnect");
    hostReload.trigger("joinRoom", { name: "Host", room: roomCode, verifier: "wrong-verifier", hostReclaimToken: hostToken });
    const reclaimed = lastEvent(hostReload, "roomJoined");
    assert.ok(reclaimed);
    assert.equal(reclaimed.payload.room.hostId, "host-2");
  } finally {
    restoreTimers();
    delete require.cache[gameRoomPath];
  }
});
