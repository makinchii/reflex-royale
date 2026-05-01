const assert = require("assert/strict");
const fs = require("fs");
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
  const play = findRoutePath(app, "/play");
  const online = findRoutePath(app, "/play/online");

  const dashboardRes = await invoke(dashboard);
  const playRes = await invoke(play);
  const onlineRes = await invoke(online);

  assert.ok(dashboardRes.sentFile?.includes("dashboard.html"));
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

test("ui-lab imports only direct thegridcn components", () => {
  const pageSource = fs.readFileSync(require.resolve("../src/app/ui-lab/page.tsx"), "utf8");
  const clientSource = fs.readFileSync(require.resolve("../src/app/ui-lab/ui-lab-client.tsx"), "utf8");
  const gridSource = fs.readFileSync(require.resolve("../src/components/grid.tsx"), "utf8");
  const layoutSource = fs.readFileSync(require.resolve("../src/app/ui-lab/layout.tsx"), "utf8");
  const atmosphereSource = fs.readFileSync(require.resolve("../src/app/ui-lab/atmosphere.ts"), "utf8");
  const selectSource = fs.readFileSync(require.resolve("../src/components/thegridcn/select.tsx"), "utf8");
  const themeSource = fs.readFileSync(require.resolve("../src/components/thegridcn-theme.css"), "utf8");
  const intensitySource = fs.readFileSync(require.resolve("../src/components/thegridcn-intensity.css"), "utf8");
  const nodemonSource = fs.readFileSync(require.resolve("../nodemon.json"), "utf8");

  assert.match(pageSource, /from "next\/headers"/);
  assert.match(pageSource, /cookies\(\)/);
  assert.match(pageSource, /initialTheme/);
  assert.match(pageSource, /initialIntensity/);
  assert.match(pageSource, /initialAtmosphere/);
  assert.doesNotMatch(pageSource, /localStorage\.getItem/);
  assert.match(pageSource, /UiLabClient/);

  assert.match(clientSource, /@\/components\/thegridcn\/button/);
  assert.match(clientSource, /@\/components\/thegridcn\/card/);
  assert.match(clientSource, /@\/components\/thegridcn\/toast/);
  assert.match(clientSource, /@\/components\/thegridcn\/dropdown/);
  assert.match(clientSource, /@\/components\/thegridcn\/dialog/);
  assert.match(clientSource, /@\/components\/thegridcn\/table/);
  assert.match(clientSource, /@\/components\/thegridcn\/input/);
  assert.match(clientSource, /@\/components\/thegridcn\/badge/);
  assert.match(clientSource, /@\/components\/thegridcn\/select/);
  assert.match(clientSource, /@\/components\/grid/);
  assert.match(clientSource, /@\/components\/theme/);
  assert.match(clientSource, /\.\/atmosphere/);
  assert.match(clientSource, /ui-lab-background/);
  assert.match(clientSource, /ui-lab-grid-3d/);
  assert.match(clientSource, /ui-lab-dashboard/);
  assert.match(clientSource, /ui-lab-control-panel/);
  assert.match(clientSource, /ui-lab-atmosphere-panel/);
  assert.match(clientSource, /ComponentSpecimen/);
  assert.match(clientSource, /cameraAnimation=\{!isIntensityNone\}/);
  assert.match(clientSource, /sway=\{atmosphere\.sway\}/);
  assert.match(clientSource, /swaySpeed=\{atmosphere\.swaySpeed\}/);
  assert.match(clientSource, /particleCount=\{atmosphere\.particleCount\}/);
  assert.match(clientSource, /beamThickness=\{atmosphere\.beamThickness\}/);
  assert.match(clientSource, /data-theme=\{theme\}/);
  assert.match(clientSource, /data-tron-intensity=\{intensity\}/);
  assert.ok(clientSource.includes('localStorage.setItem("ui-lab-theme"'));
  assert.ok(clientSource.includes('localStorage.setItem("ui-lab-intensity"'));
  assert.match(clientSource, /document\.cookie =/);
  assert.match(clientSource, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(clientSource, /document\.documentElement\.dataset\.tronIntensity = intensity/);
  assert.match(clientSource, /SelectTrigger/);
  assert.match(clientSource, /SelectContent/);
  assert.match(clientSource, /SelectItem/);
  assert.match(clientSource, /Component: Button/);
  assert.match(clientSource, /Component: Badge/);
  assert.match(clientSource, /Component: Input/);
  assert.match(clientSource, /Component: Select/);
  assert.match(clientSource, /Component: Dropdown/);
  assert.match(clientSource, /Component: Dialog/);
  assert.match(clientSource, /Component: Toast/);
  assert.match(clientSource, /Component: Table/);
  assert.match(clientSource, /Component: Card/);
  assert.match(clientSource, /Switch to \{isAres \? "Tron" : "Ares"\}/);
  assert.match(clientSource, /INTENSITY_OPTIONS/);
  assert.match(clientSource, /Intensity: \{intensity\}/);
  assert.match(clientSource, /ATMOSPHERE_PRESET_OPTIONS/);
  assert.match(clientSource, /RangeField/);
  assert.match(clientSource, /Grid Sway/);
  assert.match(clientSource, /Drift Speed/);
  assert.match(clientSource, /Background Visibility/);
  assert.match(clientSource, /Particle Density/);
  assert.match(clientSource, /Beam Strength/);
  assert.match(clientSource, /ui-lab-grid-sway-duration/);
  assert.match(clientSource, /max=\{500\}/);
  assert.match(gridSource, /HORIZON_TARGET/);
  assert.match(gridSource, /camera\.position\.set\(0, 7\.2, 28\)/);
  assert.match(gridSource, /particleCount = 180/);
  assert.match(gridSource, /beamThickness = 0\.045/);
  assert.match(gridSource, /cylinderGeometry args=\{\[thickness, thickness, 26, 8\]\}/);
  assert.match(gridSource, /opacity = 0\.42/);
  assert.match(gridSource, /function SceneSway/);
  assert.match(gridSource, /rotation\.z = Math\.sin\(time \* 0\.8\)/);
  assert.match(gridSource, /rotation\.y = Math\.sin\(time \* 0\.5\)/);
  assert.match(gridSource, /cameraAnimation \&\& <CameraController \/>/);
  assert.doesNotMatch(gridSource, /Math\.cos\(time\)/);
  assert.doesNotMatch(gridSource, /camera\.position\.z = Math\.sin\(time\)/);
  assert.match(clientSource, /fixed background viewport/);
  assert.match(selectSource, /data-slot="select-trigger"/);
  assert.match(selectSource, /data-slot="select-content"/);
  assert.match(selectSource, /data-slot="select-item"/);
  assert.match(intensitySource, /select-trigger/);
  assert.match(intensitySource, /select-content/);
  assert.match(intensitySource, /select-item/);
  assert.match(intensitySource, /prefers-reduced-motion/);
  assert.match(layoutSource, /@\/components\/thegridcn-theme\.css/);
  assert.match(layoutSource, /@\/components\/thegridcn-intensity\.css/);
  assert.match(themeSource, /\[data-theme="tron"\]/);
  assert.match(themeSource, /--glow:/);
  assert.match(themeSource, /--glow-muted:/);
  assert.match(intensitySource, /--ui-lab-grid-opacity: 0\.48/);
  assert.match(intensitySource, /--ui-lab-grid-opacity: 0\.58/);
  assert.match(intensitySource, /--ui-lab-grid-opacity: 0\.72/);
  assert.match(intensitySource, /--ui-lab-grid-opacity-multiplier: 1/);
  const uiLabCssSource = fs.readFileSync(require.resolve("../src/app/ui-lab/ui-lab.css"), "utf8");
  assert.match(uiLabCssSource, /@keyframes ui-lab-grid-sway/);
  assert.match(uiLabCssSource, /animation: ui-lab-grid-sway var\(--ui-lab-grid-sway-duration, 18s\) ease-in-out infinite alternate/);
  assert.match(uiLabCssSource, /ui-lab-atmosphere-panel/);
  assert.match(uiLabCssSource, /ui-lab-range-field/);
  assert.match(uiLabCssSource, /ui-lab-range/);
  assert.match(uiLabCssSource, /ui-lab-grid-sway-x/);
  assert.match(uiLabCssSource, /ui-lab-grid-sway-y/);
  assert.match(nodemonSource, /"\.next"/);
  assert.match(nodemonSource, /"server\.js"/);

  assert.match(atmosphereSource, /DEFAULT_ATMOSPHERE/);
  assert.match(atmosphereSource, /applyAtmospherePreset/);
  assert.match(atmosphereSource, /parseAtmosphere/);

  assert.doesNotMatch(pageSource, /@\/components\/ui\//);
  assert.doesNotMatch(pageSource, /@\/components\/button/);
  assert.doesNotMatch(pageSource, /@\/components\/card/);
  assert.doesNotMatch(pageSource, /@\/components\/dialog/);
  assert.doesNotMatch(pageSource, /@\/components\/dropdown-menu/);
  assert.doesNotMatch(pageSource, /@\/components\/table/);
  assert.doesNotMatch(pageSource, /@\/components\/input/);
  assert.doesNotMatch(pageSource, /@\/components\/badge/);
});

test("dashboard page renders a command center layout", () => {
  const dashboardSource = fs.readFileSync(require.resolve("../src/app/dashboard/page.tsx"), "utf8");
  const tabsSource = fs.readFileSync(require.resolve("../src/components/app/dashboard-tabs.tsx"), "utf8");

  assert.match(dashboardSource, /DashboardTabs/);
  assert.match(dashboardSource, /AuthMenu/);
  assert.match(tabsSource, /Playing/);
  assert.match(tabsSource, /Analytics/);
  assert.match(tabsSource, /Settings/);
  assert.match(tabsSource, /Top Players/);
  assert.match(tabsSource, /Recent Activity/);
  assert.match(tabsSource, /Play Now!/);
  assert.match(tabsSource, /useState/);
});

test("auth pages prevent credential query-string fallback", () => {
  const authPageSource = fs.readFileSync(require.resolve("../src/components/app/auth-page.tsx"), "utf8");
  const scriptSource = fs.readFileSync(require.resolve("../public/script.js"), "utf8");
  const authRouteSource = fs.readFileSync(require.resolve("../routes/auth.js"), "utf8");

  assert.match(authPageSource, /method="post"/);
  assert.match(authPageSource, /action=\{mode === "signup" \? "\/api\/auth\/signup" : "\/api\/auth\/login"\}/);
  assert.match(authPageSource, /minLength=\{3\}/);
  assert.match(authPageSource, /maxLength=\{20\}/);
  assert.match(authPageSource, /pattern="\[A-Za-z0-9_-\]\+"/);
  assert.match(authPageSource, /minLength=\{8\}/);
  assert.match(scriptSource, /USERNAME_PATTERN/);
  assert.match(scriptSource, /MIN_PASSWORD_LENGTH/);
  assert.match(authRouteSource, /USERNAME_PATTERN/);
  assert.match(authRouteSource, /Password must be at least 8 characters/);
  assert.match(authRouteSource, /That username is already taken/);
});
