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

test("guest can access dashboard and game routes", async () => {
  const { createApp } = loadServerModule();
  const app = createApp({ useSessionStore: false });
  const dashboard = findRoutePath(app, "/dashboard");
  const navigate = findRoutePath(app, "/navigate");
  const local = findRoutePath(app, "/local");
  const online = findRoutePath(app, "/online");

  const dashboardRes = await invoke(dashboard);
  const navigateRes = await invoke(navigate);
  const localRes = await invoke(local);
  const onlineRes = await invoke(online);

  assert.ok(dashboardRes.sentFile?.includes("dashboard.html"));
  assert.ok(navigateRes.sentFile?.includes("index.html"));
  assert.ok(localRes.sentFile?.includes("game-local.html"));
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
  assert.match(tabsSource, /AuthMenu/);
  assert.match(tabsSource, /Play Now/);
  assert.match(tabsSource, /Analytics/);
  assert.match(tabsSource, /Settings/);
  assert.match(tabsSource, /Top Players/);
  assert.match(tabsSource, /Recent Activity/);
  assert.match(tabsSource, /Play Now!/);
  assert.match(tabsSource, /useState/);
});

test("navigate page renders orbital route selection", () => {
  const landingSource = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  const navigateSource = fs.readFileSync(require.resolve("../src/app/navigate/page.tsx"), "utf8");
  const sceneSource = fs.readFileSync(require.resolve("../src/components/app/navigation-scene.tsx"), "utf8");
  const globeSource = fs.readFileSync(require.resolve("../src/components/app/wireframe-dotted-globe.tsx"), "utf8");
  const locationSource = fs.readFileSync(require.resolve("../src/components/thegridcn/location-display.tsx"), "utf8");
  const reticleSource = fs.readFileSync(require.resolve("../src/components/thegridcn/reticle.tsx"), "utf8");
  const globalsSource = fs.readFileSync(require.resolve("../src/app/globals.css"), "utf8");
  const navigateStylesSource = fs.readFileSync(require.resolve("../src/app/navigate/navigate.css"), "utf8");
  const layoutSource = fs.readFileSync(require.resolve("../src/app/layout.tsx"), "utf8");

  assert.match(landingSource, /playNowHref = "\/navigate"/);
  assert.match(navigateSource, /NavigationScene/);
  assert.match(navigateSource, /getCurrentUser/);
  assert.doesNotMatch(navigateSource, /AuthMenu/);
  assert.match(sceneSource, /CircuitBackground/);
  assert.match(sceneSource, /WireframeDottedGlobe/);
  assert.doesNotMatch(sceneSource, /DerezTimer/);
  assert.match(sceneSource, /LocationDisplay/);
  assert.match(sceneSource, /Reticle/);
  assert.match(sceneSource, /variant="scanning"/);
  assert.doesNotMatch(sceneSource, /navigate-border-hud__readout/);
  assert.match(sceneSource, /MoonNode/);
  assert.match(sceneSource, /navigate-earth/);
  assert.match(sceneSource, /navigate-moon/);
  assert.match(sceneSource, /SimplePlanet/);
  assert.match(sceneSource, /navigate-route-stack/);
  assert.match(sceneSource, /href="\/local"/);
  assert.match(sceneSource, /canPlayOnline/);
  assert.match(sceneSource, /href="\/online"/);
  assert.match(sceneSource, /href="\/"/);
  assert.match(sceneSource, /navigate-tab--exit/);
  assert.match(sceneSource, /Create an account to unlock online play/);
  assert.match(sceneSource, /aria-disabled="true"/);
  assert.match(globalsSource, /\.\/navigate\/navigate\.css/);
  assert.doesNotMatch(globalsSource, /\.navigate-circuit-bg/);
  assert.match(navigateStylesSource, /\.navigate-circuit-bg/);
  assert.match(navigateStylesSource, /\.navigate-border-hud/);
  assert.doesNotMatch(globalsSource, /\.navigate-derez-timer/);
  assert.match(navigateStylesSource, /\.navigate-location-display/);
  assert.match(navigateStylesSource, /\.navigate-body-reticle/);
  assert.match(navigateStylesSource, /\.navigate-simple-planet/);
  assert.match(sceneSource, /kind="moon"/);
  assert.match(navigateStylesSource, /\.navigate-globe-canvas/);
  assert.match(navigateStylesSource, /\.navigate-moon__orbit/);
  assert.match(navigateStylesSource, /\.navigate-route-line--online/);
  assert.match(navigateStylesSource, /\.navigate-tab--disabled/);
  assert.match(navigateStylesSource, /\.navigate-tooltip/);
  assert.match(navigateStylesSource, /\.navigate-tab:hover/);
  assert.match(navigateStylesSource, /:has\(\.navigate-tab:hover\)/);
  assert.match(globeSource, /projectVisiblePoint/);
  assert.match(globeSource, /natural-earth-geojson/);
  assert.match(globeSource, /prefers-reduced-motion/);
  assert.match(locationSource, /LocationDisplay/);
  assert.match(reticleSource, /variant\?: "default" \| "locked" \| "scanning"/);
  assert.match(layoutSource, /AudioController/);
});

test("game routes render inside the modern game shell", () => {
  const localPageSource = fs.readFileSync(require.resolve("../src/app/local/page.tsx"), "utf8");
  const onlinePageSource = fs.readFileSync(require.resolve("../src/app/online/page.tsx"), "utf8");
  const shellSource = fs.readFileSync(require.resolve("../src/components/app/game-page-shell.tsx"), "utf8");
  const tabsSource = fs.readFileSync(require.resolve("../src/components/app/dashboard-tabs.tsx"), "utf8");
  const legacyShellSource = fs.readFileSync(require.resolve("../src/components/legacy-game-shell.tsx"), "utf8");
  const gameCssSource = fs.readFileSync(require.resolve("../public/game.css"), "utf8");
  const buttonSource = fs.readFileSync(require.resolve("../src/components/thegridcn/button.tsx"), "utf8");

  assert.match(localPageSource, /GamePageShell/);
  assert.match(localPageSource, /mode="local"/);
  assert.match(localPageSource, /showAccountMenu=\{false\}/);
  assert.match(onlinePageSource, /GamePageShell/);
  assert.match(onlinePageSource, /mode="online"/);
  assert.match(onlinePageSource, /requireCurrentUser/);
  assert.match(shellSource, /GridBackground/);
  assert.doesNotMatch(shellSource, /AuthMenu/);
  assert.match(shellSource, /Mode/);
  assert.match(shellSource, /Legacy bridge/);
  assert.match(shellSource, /play-command-button/);
  assert.doesNotMatch(shellSource, /@\/components\/thegridcn\/button/);
  assert.doesNotMatch(shellSource, /max-w-\[min\(1500px,calc\(100vw-2rem\)\)\]/);
  assert.doesNotMatch(shellSource, /CardContent/);
  assert.doesNotMatch(shellSource, /@\/components\/thegridcn\/card/);
  assert.match(shellSource, /min-h-0/);
  assert.match(shellSource, /play-cockpit-shell/);
  assert.match(shellSource, /play-command-banner/);
  assert.match(shellSource, /play-command-banner__identity/);
  assert.match(shellSource, /play-command-banner__summary/);
  assert.match(shellSource, /play-command-banner__actions/);
  assert.doesNotMatch(shellSource, /bg-background\/70/);
  assert.doesNotMatch(shellSource, /bg-card\/45/);
  assert.match(shellSource, /game-shell-stage/);
  assert.match(shellSource, /game-hud-frame/);
  assert.match(legacyShellSource, /showAccountMenu = true/);
  assert.match(buttonSource, /transition-\[background-color,color,border-color,box-shadow,transform\] duration-500/);
  assert.match(buttonSource, /border-2 !border-primary !bg-transparent !text-primary hover:!bg-primary hover:!text-primary-foreground/);
  assert.doesNotMatch(buttonSource, /hover:shadow-\[0_0_24px_color-mix/);
  assert.match(buttonSource, /active:translate-y-px/);
  assert.doesNotMatch(buttonSource, /before:scale-x-0/);
  assert.match(buttonSource, /rounded-none/);
  assert.match(buttonSource, /data-slot="button"/);
  assert.doesNotMatch(buttonSource, /playUiClick/);
  const localLegacySource = fs.readFileSync(require.resolve("../public/js/UIRenderer.js"), "utf8");
  const remoteLegacySource = fs.readFileSync(require.resolve("../public/js/remote.js"), "utf8");
  const keyMapSource = fs.readFileSync(require.resolve("../public/js/keyMap.js"), "utf8");
  const sliderSource = fs.readFileSync(require.resolve("../src/components/thegridcn/slider.tsx"), "utf8");
  assert.match(sliderSource, /@radix-ui\/react-slider/);
  assert.match(sliderSource, /data-slot="slider"/);
  assert.match(sliderSource, /data-slot="slider-track"/);
  assert.match(sliderSource, /data-slot="slider-range"/);
  assert.match(sliderSource, /data-slot="slider-thumb"/);
  assert.match(sliderSource, /size-4/);
  assert.match(gameCssSource, /--round-slider-accent: var\(--primary/);
  assert.doesNotMatch(gameCssSource, /#ffd000/);
  assert.match(localLegacySource, /type="range"/);
  assert.match(localLegacySource, /holoKeyboardMount/);
  assert.match(localLegacySource, /renderHolographicKeyboard/);
  assert.match(localLegacySource, /normalizeGameKey/);
  assert.match(localLegacySource, /dragstart/);
  assert.match(localLegacySource, /movePlayerKey/);
  assert.match(localLegacySource, /round-slider/);
  assert.match(localLegacySource, /roundCountValue/);
  assert.match(remoteLegacySource, /type="range"/);
  assert.match(remoteLegacySource, /holoKeyboardMount/);
  assert.match(remoteLegacySource, /renderHolographicKeyboard/);
  assert.match(remoteLegacySource, /normalizeGameKey/);
  assert.match(remoteLegacySource, /dragstart/);
  assert.match(remoteLegacySource, /bindKey/);
  assert.match(remoteLegacySource, /round-slider--host/);
  assert.match(remoteLegacySource, /roundCountInputValue/);
  assert.match(remoteLegacySource, /btn-go/);
  assert.match(keyMapSource, /holo-keyboard-panel/);
  assert.match(keyMapSource, /KEYBOARD_ROWS/);
  const globalsSource = fs.readFileSync(require.resolve("../src/app/globals.css"), "utf8");
  const gameShellStylesSource = fs.readFileSync(require.resolve("../src/app/game-shell.css"), "utf8");
  assert.match(globalsSource, /\.\/game-shell\.css/);
  assert.doesNotMatch(globalsSource, /\.play-cockpit-shell/);
  assert.match(gameShellStylesSource, /\.play-cockpit-shell/);
  assert.match(gameShellStylesSource, /\.play-command-banner/);
  assert.match(gameShellStylesSource, /\.play-command-button/);
  assert.match(gameShellStylesSource, /\.play-command-button:hover/);
  assert.match(gameShellStylesSource, /grid-template-columns: auto minmax\(16rem, 1fr\) auto/);
  assert.match(gameShellStylesSource, /\.game-hud-frame/);
  assert.match(gameShellStylesSource, /margin-inline: clamp/);
  assert.match(gameShellStylesSource, /game-hud-frame__content/);
  assert.match(gameShellStylesSource, /padding: clamp\(2rem, 4vw, 4\.5rem\)/);
  assert.match(gameCssSource, /#game-root \.btn:focus-visible/);
  assert.match(gameCssSource, /#game-root \.btn-remove:focus-visible/);
  assert.match(gameCssSource, /\.holo-keyboard-panel/);
  assert.match(gameCssSource, /\.holo-key--bound/);
  assert.match(gameCssSource, /\.holo-key--ready/);
  assert.match(gameCssSource, /\.holo-key--dragging/);
  assert.match(gameCssSource, /\.holo-key--drop-target/);
  assert.match(gameCssSource, /box-shadow 500ms ease/);
  assert.match(gameCssSource, /0 0 38px color-mix\(in oklch, var\(--primary/);
  assert.match(gameCssSource, /translateY\(1px\)/);
  assert.match(tabsSource, /active:translate-y-px/);
  assert.match(gameCssSource, /Legacy-mounted game surface/);
  assert.match(gameCssSource, /#game-root/);
  assert.match(gameCssSource, /height: 100%/);
  assert.match(gameCssSource, /#game-root \.arena,/);
  assert.match(gameCssSource, /#game-root \.arena-solo/);
  assert.match(gameCssSource, /font-family: var\(--font-orbitron\)/);
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
