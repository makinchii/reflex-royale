const assert = require("assert/strict");
const path = require("path");
const { performance } = require("perf_hooks");
const test = require("node:test");
const ts = require("typescript");

const gameEnginePath = path.join(__dirname, "..", "src", "lib", "game", "game-engine.ts");
const gameKeysPath = path.join(__dirname, "..", "src", "lib", "game", "keys.ts");

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.tasks = new Map();
  }

  setTimeout(fn, delay) {
    const id = this.nextId++;
    this.tasks.set(id, { type: "timeout", fn, time: this.now + delay, delay });
    return id;
  }

  setInterval(fn, interval) {
    const id = this.nextId++;
    this.tasks.set(id, { type: "interval", fn, time: this.now + interval, interval });
    return id;
  }

  clearTimeout(id) {
    this.tasks.delete(id);
  }

  clearInterval(id) {
    this.tasks.delete(id);
  }

  tick(ms) {
    const target = this.now + ms;

    while (true) {
      let nextTaskId = null;
      let nextTask = null;

      for (const [id, task] of this.tasks.entries()) {
        if (task.time <= target && (!nextTask || task.time < nextTask.time)) {
          nextTaskId = id;
          nextTask = task;
        }
      }

      if (!nextTask) {
        break;
      }

      this.now = nextTask.time;

      if (nextTask.type === "timeout") {
        this.tasks.delete(nextTaskId);
        nextTask.fn();
      } else {
        nextTask.fn();
        if (this.tasks.has(nextTaskId)) {
          nextTask.time += nextTask.interval;
        }
      }
    }

    this.now = target;
  }
}

function loadGameEngine(clock = new FakeClock()) {
  const originalRandom = Math.random;
  const originalPerformanceNow = performance.now;
  const originalGlobalPerformance = global.performance;
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  const originalClearTimeout = global.clearTimeout;
  const originalClearInterval = global.clearInterval;
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

  Math.random = () => 0;
  performance.now = () => clock.now;
  global.performance = { now: () => clock.now };
  global.setTimeout = clock.setTimeout.bind(clock);
  global.setInterval = clock.setInterval.bind(clock);
  global.clearTimeout = clock.clearTimeout.bind(clock);
  global.clearInterval = clock.clearInterval.bind(clock);

  delete require.cache[gameEnginePath];
  delete require.cache[gameKeysPath];
  const exports = require(gameEnginePath);

  Math.random = originalRandom;
  performance.now = originalPerformanceNow;
  global.performance = originalGlobalPerformance;
  global.setTimeout = originalSetTimeout;
  global.setInterval = originalSetInterval;
  global.clearTimeout = originalClearTimeout;
  global.clearInterval = originalClearInterval;
  if (originalTsExtension) {
    require.extensions[".ts"] = originalTsExtension;
  } else {
    delete require.extensions[".ts"];
  }

  return { ...exports, clock };
}

function createReadyEngine() {
  const { GameEngine, GameState, clock } = loadGameEngine();
  const engine = new GameEngine({ totalRounds: 1, countdownSeconds: 1, minDelay: 100, maxDelay: 100, maxReactionTime: 1000, targetScore: 10 });

  engine.addPlayer("p1", "Ada", "a");
  engine.addPlayer("p2", "Bea", "b");
  engine.addPlayer("p3", "Cal", "c");

  engine.confirmPlayerByKey("a");
  engine.confirmPlayerByKey("b");
  engine.confirmPlayerByKey("c");

  return { engine, GameState, clock };
}

test("toggles ready state and rejects duplicate keys", () => {
  const { GameEngine } = loadGameEngine();
  const engine = new GameEngine();

  assert.equal(engine.addPlayer("p1", "Ada", "a"), true);
  assert.equal(engine.addPlayer("p2", "Bea", "a"), false);

  assert.equal(engine.confirmPlayerByKey("a"), true);
  assert.equal(engine.getPlayer("p1").ready, true);

  assert.equal(engine.confirmPlayerByKey("a"), true);
  assert.equal(engine.getPlayer("p1").ready, false);
});

test("rejects duplicate local player theme protocols", () => {
  const { GameEngine } = loadGameEngine();
  const engine = new GameEngine();

  assert.equal(engine.addPlayer("p1", "Ada", "a", "#ff003c", "ares"), true);
  assert.equal(engine.addPlayer("p2", "Bea", "b", "#FF5050", "ares"), false);
  assert.equal(engine.addPlayer("p2", "Bea", "b", "#ff7a00", "vulcan"), true);
  assert.equal(engine.getPlayer("p1").themeCommand, "ares");
  assert.equal(engine.getPlayer("p2").themeCommand, "vulcan");
});

test("normalizes shifted keys before storing and matching players", () => {
  const { GameEngine } = loadGameEngine();
  const engine = new GameEngine();

  assert.equal(engine.addPlayer("p1", "Ada", "!"), true);
  assert.equal(engine.getPlayer("p1").key, "1");
  assert.equal(engine.addPlayer("p2", "Bea", "1"), false);
  assert.equal(engine.confirmPlayerByKey("!"), true);
  assert.equal(engine.getPlayer("p1").ready, true);
  assert.equal(engine.findPlayerByKey("!"), "p1");
  assert.equal(engine.addPlayer("p3", "Cal", "Enter"), false);
});

test("moves an unready player key to an empty normalized key", () => {
  const { GameEngine } = loadGameEngine();
  const engine = new GameEngine();

  engine.addPlayer("p1", "Ada", "a");
  engine.addPlayer("p2", "Bea", "b");

  assert.equal(engine.movePlayerKey("p1", "!"), true);
  assert.equal(engine.getPlayer("p1").key, "1");
  assert.equal(engine.movePlayerKey("p1", "b"), false);

  engine.confirmPlayerByKey("1");
  assert.equal(engine.movePlayerKey("p1", "c"), false);
});

test("requires every player to be ready before starting", () => {
  const { GameEngine, GameState } = loadGameEngine();
  const engine = new GameEngine();

  engine.addPlayer("p1", "Ada", "a");
  engine.addPlayer("p2", "Bea", "b");

  assert.equal(engine.startGame(), false);
  engine.confirmPlayerByKey("a");
  assert.equal(engine.startGame(), false);
  engine.confirmPlayerByKey("b");
  assert.equal(engine.startGame(), true);
  assert.equal(engine.state, GameState.COUNTDOWN);
});

test("scores valid inputs, false starts, and misses deterministically", () => {
  const { engine, GameState, clock } = createReadyEngine();
  const events = [];

  engine.on("roundEnd", (payload) => events.push(payload));
  engine.on("gameOver", (payload) => events.push(payload));

  assert.equal(engine.startGame(), true);

  clock.tick(1000);
  engine.handleInput("p3");

  clock.tick(100);
  assert.equal(engine.state, GameState.REACT);

  clock.tick(50);
  engine.handleInput("p1");

  clock.tick(1000);

  assert.equal(engine.state, GameState.ROUND_END);
  assert.equal(engine.roundHistory.length, 1);
  assert.equal(engine.roundHistory[0].results[0].id, "p1");
  assert.equal(engine.roundHistory[0].results[0].time, 50);
  const falseStartResult = engine.roundHistory[0].results.find((result) => result.id === "p3");
  const missedResult = engine.roundHistory[0].results.find((result) => result.id === "p2");
  assert.equal(falseStartResult?.falseStart, true);
  assert.equal(missedResult?.missed, true);

  engine.nextRound();
  assert.equal(engine.state, GameState.GAME_OVER);
  assert.equal(events.some((event) => event.standings), true);
});

test("round scoring smoke test stays fast", () => {
  const { GameEngine, GameState } = loadGameEngine();
  const engine = new GameEngine();

  engine.addPlayer("p1", "Ada", "a");
  engine.addPlayer("p2", "Bea", "b");
  engine.addPlayer("p3", "Cal", "c");
  engine.addPlayer("p4", "Dee", "d");

  const start = performance.now();

  for (let i = 0; i < 250; i += 1) {
    engine.state = GameState.REACT;
    engine._reactStartTime = 0;

    const times = [40, 80, 120, null];
    for (let index = 0; index < engine.getPlayers().length; index += 1) {
      const player = engine.getPlayers()[index];
      player._pressed = times[index] !== null;
      player._reactionTime = times[index];
      player._falseStart = false;
    }

    engine._endRound();
  }

  const elapsed = performance.now() - start;
  assert.ok(elapsed < 500, `Expected smoke test to finish under 500ms, took ${elapsed}ms`);
});

test("clears pending timers when resetting during delayed match start", () => {
  const { engine, GameState, clock } = createReadyEngine();
  const events = [];
  engine.on("countdown", (payload) => events.push(payload));

  assert.equal(engine.startGame({ countdownDelayMs: 500 }), true);
  assert.equal(engine.state, GameState.COUNTDOWN);

  engine.resetToLobby();
  clock.tick(500);

  assert.equal(engine.state, GameState.LOBBY);
  assert.deepEqual(events, []);
});

test("emits each local countdown tick before waiting", () => {
  const { GameEngine, GameState, clock } = loadGameEngine();
  const engine = new GameEngine({ countdownSeconds: 3, minDelay: 100, maxDelay: 100 });
  const events = [];

  engine.addPlayer("p1", "Ada", "a");
  engine.addPlayer("p2", "Bea", "b");
  engine.confirmPlayerByKey("a");
  engine.confirmPlayerByKey("b");
  engine.on("countdown", (payload) => events.push(payload.remaining));

  assert.equal(engine.startGame(), true);
  assert.equal(engine.state, GameState.COUNTDOWN);
  assert.deepEqual(events, [3]);

  clock.tick(1000);
  assert.deepEqual(events, [3, 2]);

  clock.tick(1000);
  assert.deepEqual(events, [3, 2, 1]);

  clock.tick(1000);
  assert.equal(engine.state, GameState.WAITING);
});

test("standings tie-break by score wins best time then name", () => {
  const { GameEngine } = loadGameEngine();
  const engine = new GameEngine();

  engine.addPlayer("p1", "Cal", "c");
  engine.addPlayer("p2", "Ada", "a");
  engine.addPlayer("p3", "Bea", "b");

  engine.getPlayer("p1").totalScore = 3;
  engine.getPlayer("p1").wins = 1;
  engine.getPlayer("p1").bestTime = 90;
  engine.getPlayer("p2").totalScore = 3;
  engine.getPlayer("p2").wins = 1;
  engine.getPlayer("p2").bestTime = 80;
  engine.getPlayer("p3").totalScore = 3;
  engine.getPlayer("p3").wins = 0;
  engine.getPlayer("p3").bestTime = 40;

  assert.deepEqual(engine.getStandings().map((player) => player.id), ["p2", "p1", "p3"]);
});
