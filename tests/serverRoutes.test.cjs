const assert = require("assert/strict");
const test = require("node:test");

function loadServerModule() {
  delete require.cache[require.resolve("../server")];
  return require("../server");
}

function findRoutePath(appInstance, routePath) {
  const layer = appInstance._router.stack.find((entry) => entry.route && entry.route.path === routePath);
  if (!layer) {
    throw new Error(`Route not found: ${routePath}`);
  }

  return layer.route.stack[0].handle;
}

async function invoke(handler, { session = null, acceptsHtml = false } = {}) {
  const req = {
    session,
    accepts(value) {
      return acceptsHtml && value === "html";
    },
    originalUrl: "/test"
  };

  const res = {
    statusCode: 200,
    redirectedTo: null,
    sentFile: null,
    jsonPayload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    redirect(url) {
      this.redirectedTo = url;
      return this;
    },
    sendFile(filePath) {
      this.sentFile = filePath;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    }
  };

  await handler(req, res);
  return res;
}

test("guest can access dashboard and play routes", async () => {
  const { createApp } = loadServerModule();
  const app = createApp({ useSessionStore: false });
  const dashboard = findRoutePath(app, "/dashboard");
  const react = findRoutePath(app, "/react");
  const play = findRoutePath(app, "/play");
  const online = findRoutePath(app, "/play/online");

  const dashboardRes = await invoke(dashboard);
  const reactRes = await invoke(react);
  const playRes = await invoke(play);
  const onlineRes = await invoke(online);

  assert.ok(dashboardRes.sentFile?.includes("dashboard.html"));
  assert.ok(reactRes.sentFile?.includes("react.html"));
  assert.ok(playRes.sentFile?.includes("game-local.html"));
  assert.ok(onlineRes.sentFile?.includes("game-remote.html"));
});

test("session endpoint exposes guest state and user state", async () => {
  const { createApp } = loadServerModule();
  const app = createApp({ useSessionStore: false });
  const sessionHandler = findRoutePath(app, "/api/auth/session");

  const guestRes = await invoke(sessionHandler);
  assert.equal(guestRes.jsonPayload.authenticated, false);
  assert.equal(guestRes.jsonPayload.user, null);

  const userRes = await invoke(sessionHandler, { session: { user: { id: "1", username: "Ada" } } });
  assert.equal(userRes.jsonPayload.authenticated, true);
  assert.equal(userRes.jsonPayload.user.username, "Ada");
});
