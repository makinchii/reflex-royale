const { expect, test } = require("@playwright/test");
const {
  ROUTE_VIEWPORTS,
  VIEWPORTS,
  expectClickable,
  expectGameSurface,
  expectInViewportAfterScroll,
  expectInside,
  expectNoHorizontalOverflow,
  expectNoPageHorizontalOverflow,
  openRoute,
  rect,
} = require("./helpers/layout");

const LANDING_COMPOSITION_VIEWPORTS = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "1080p-browser-content", width: 1920, height: 966 },
  { name: "qhd-effective", width: 2560, height: 1440 },
];

const AUDIO_DIALOG_VIEWPORTS = LANDING_COMPOSITION_VIEWPORTS;

function viewportBox(viewport) {
  return { x: 0, y: 0, width: viewport.width, height: viewport.height };
}

async function landingRatios(page, viewport) {
  await openRoute(page, "/", viewport);
  const frame = await rect(page, ".landing-page-frame");
  const hero = await rect(page, ".landing-hero-card");
  const title = await rect(page, ".landing-title-lockup");
  const actions = await rect(page, ".landing-action-row");
  const leaderboard = await rect(page, ".landing-leaderboard-terminal");

  return {
    heroWidth: hero.width / frame.width,
    heroHeight: hero.height / frame.height,
    titleHeight: title.height / frame.height,
    actionHeight: actions.height / frame.height,
    leaderboardWidth: leaderboard.width / frame.width,
    leaderboardHeight: leaderboard.height / frame.height,
  };
}

function expectCloseRatio(actual, expected, label, tolerance = 0.035) {
  expect(Math.abs(actual - expected), `${label} ratio parity`).toBeLessThanOrEqual(tolerance);
}

async function routeLineEndpoint(page, lineSelector, buttonSelector, direction) {
  return page.evaluate(({ lineSelector, buttonSelector, direction }) => {
    const line = document.querySelector(lineSelector);
    const button = document.querySelector(buttonSelector);
    if (!line || !button) return null;

    const lineStyle = getComputedStyle(line);
    const buttonBox = button.getBoundingClientRect();
    const width = parseFloat(lineStyle.width);
    const transform = new DOMMatrixReadOnly(lineStyle.transform === "none" ? undefined : lineStyle.transform);
    const angle = Math.atan2(transform.b, transform.a);
    const origin = direction === "left"
      ? { x: buttonBox.left + 16, y: buttonBox.top + buttonBox.height / 2 }
      : { x: buttonBox.right - 16, y: buttonBox.top + buttonBox.height / 2 };
    const sign = direction === "left" ? -1 : 1;

    return {
      x: origin.x + Math.cos(angle) * width * sign,
      y: origin.y + Math.sin(angle) * width * sign,
    };
  }, { lineSelector, buttonSelector, direction });
}

function expectPointInside(box, point, label) {
  expect(point, `${label} should resolve`).not.toBeNull();
  expect(point.x, `${label} x`).toBeGreaterThanOrEqual(box.x - 2);
  expect(point.x, `${label} x`).toBeLessThanOrEqual(box.x + box.width + 2);
  expect(point.y, `${label} y`).toBeGreaterThanOrEqual(box.y - 2);
  expect(point.y, `${label} y`).toBeLessThanOrEqual(box.y + box.height + 2);
}

for (const viewport of ROUTE_VIEWPORTS) {
  test(`landing route scales at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/", viewport);
    await expect(page.getByRole("heading", { name: /reflex royale/i })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
    await expectClickable(page, 'a[href="/navigate"]');
    if (viewport.width >= 420) await expectInViewportAfterScroll(page, "text=Leaderboard Terminal");
  });

  for (const route of ["/login", "/signup"]) {
    test(`${route} form scales at ${viewport.name}`, async ({ page }) => {
      await openRoute(page, route, viewport);
      await expectNoPageHorizontalOverflow(page);
      await expectClickable(page, "#username");
      await expectClickable(page, "#password");
      await expectClickable(page, 'button[type="submit"]');
    });
  }

  test(`navigate route controls scale at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/navigate", viewport);
    await expectNoPageHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: /choose vector/i })).toBeVisible();
    await expectClickable(page, 'a[href="/local"]');
    await expectInViewportAfterScroll(page, ".navigate-route-stack");
    if (viewport.width >= 900) {
      await expect(page.locator(".navigate-grid-backdrop canvas")).toBeVisible();
      await expect(page.locator(".navigate-simple-planet")).toHaveCount(0);
      const backdrop = await rect(page, ".navigate-grid-backdrop");
      expect(backdrop.x, "navigate grid backdrop should extend past left edge").toBeLessThanOrEqual(-viewport.width * 0.08);
      expect(backdrop.y, "navigate grid backdrop should extend past top edge").toBeLessThanOrEqual(-viewport.height * 0.08);
      expect(backdrop.x + backdrop.width, "navigate grid backdrop should extend past right edge").toBeGreaterThanOrEqual(viewport.width * 1.08);
      expect(backdrop.y + backdrop.height, "navigate grid backdrop should extend past bottom edge").toBeGreaterThanOrEqual(viewport.height * 1.08);
    }
  });

  test(`ui lab route scales at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/ui-lab", viewport);
    await expectNoPageHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: /component dashboard/i })).toBeVisible();
    await expectInViewportAfterScroll(page, ".ui-lab-dashboard-header");
    await expectInViewportAfterScroll(page, ".ui-lab-dashboard-grid");
  });

  test(`dashboard route scales at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/dashboard", viewport, { authenticated: true });
    await expectNoPageHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: /choose your arena/i })).toBeVisible();
    await expectClickable(page, 'a[href="/navigate"]');
    await expectInViewportAfterScroll(page, ".dashboard-content");
  });
}

for (const viewport of LANDING_COMPOSITION_VIEWPORTS) {
  test(`landing composition is visible at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/", viewport);

    const viewportBounds = viewportBox(viewport);
    const frame = await rect(page, ".landing-page-frame");
    const hero = await rect(page, ".landing-hero-card");
    const title = await rect(page, ".landing-title-lockup");
    const actions = await rect(page, ".landing-action-row");
    const leaderboard = await rect(page, ".landing-leaderboard-terminal");
    const footer = await rect(page, ".landing-footer-text");

    expectInside(viewportBounds, hero, "landing hero");
    expectInside(viewportBounds, actions, "landing actions");
    expectInside(viewportBounds, leaderboard, "landing leaderboard");
    expectInside(viewportBounds, footer, "landing footer");
    expectInside(frame, hero, "landing hero inside frame");
    expectInside(frame, actions, "landing actions inside frame");
    expectInside(frame, leaderboard, "landing leaderboard inside frame");
    expectInside(frame, footer, "landing footer inside frame");

    expect(title.height, "landing title should not dominate viewport height").toBeLessThanOrEqual(viewport.height * 0.31);
    expect(hero.y + hero.height, "actions should sit below hero").toBeLessThanOrEqual(actions.y - 8);
    expect(actions.y + actions.height, "leaderboard should sit below actions").toBeLessThanOrEqual(leaderboard.y - 8);
    expect(leaderboard.y + leaderboard.height, "footer should not overlap leaderboard").toBeLessThanOrEqual(footer.y - 8);

    const buttons = await page.locator(".landing-action-button").evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    if (buttons.length > 1) {
      expect(Math.abs(buttons[0].width - buttons[1].width), "landing CTA buttons should have equal width").toBeLessThanOrEqual(1);
      expect(Math.abs(buttons[0].height - buttons[1].height), "landing CTA buttons should have equal height").toBeLessThanOrEqual(1);
    }

    const rowCount = await page.locator(".landing-leaderboard-row").count();
    expect(rowCount, "landing leaderboard should render 10 rows").toBe(10);
    const bodyOverflow = await page.locator(".landing-leaderboard-body").evaluate((node) => node.scrollHeight - node.clientHeight);
    expect(bodyOverflow, "desktop leaderboard body should show all rows without scroll clipping").toBeLessThanOrEqual(1);
    for (let index = 0; index < rowCount; index += 1) {
      expectInside(leaderboard, await page.locator(".landing-leaderboard-row").nth(index).boundingBox(), `landing leaderboard row ${index + 1}`);
    }

    const terminal = await rect(page, ".landing-terminal");
    const radar = await rect(page, ".landing-radar");
    const location = await rect(page, ".landing-location");

    expectInside(frame, terminal, "left decor inside frame");
    expectInside(frame, radar, "radar decor inside frame");
    expectInside(frame, location, "right decor inside frame");
  });
}

test("navigate route animates bodies only on corresponding hover", async ({ page }) => {
  await page.addInitScript(() => {
    const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
    window.__navigateCanvasFrames = { local: 0, online: 0, other: 0 };
    CanvasRenderingContext2D.prototype.clearRect = function patchedClearRect(...args) {
      const canvas = this.canvas;
      const counters = window.__navigateCanvasFrames;
      if (counters && canvas instanceof HTMLCanvasElement) {
        if (canvas.closest(".navigate-earth-viewport-layer")) counters.local += 1;
        else if (canvas.closest(".navigate-link-field--online")) counters.online += 1;
        else counters.other += 1;
      }
      return originalClearRect.apply(this, args);
    };
  });

  await openRoute(page, "/navigate", { name: "1080p", width: 1920, height: 1080 });
  await expect(page.locator(".navigate-grid-backdrop canvas")).toBeVisible();
  await expect(page.locator(".navigate-simple-planet")).toHaveCount(0);
  await expect(page.locator(".navigate-earth-viewport-layer canvas")).toBeVisible();
  await expect(page.locator(".navigate-link-field--online canvas")).toBeVisible();
  await page.waitForTimeout(800);

  const readFrames = () => page.evaluate(() => ({ ...window.__navigateCanvasFrames }));
  const idleStart = await readFrames();
  await page.waitForTimeout(500);
  const idleEnd = await readFrames();
  expect(idleEnd.local - idleStart.local, "local globe should not redraw while idle").toBeLessThanOrEqual(1);
  expect(idleEnd.online - idleStart.online, "online globe should not redraw while idle").toBeLessThanOrEqual(1);

  const earthBox = await page.locator(".navigate-earth-viewport-layer canvas").boundingBox();
  expect(earthBox, "local earth canvas should have a layout box").not.toBeNull();
  await page.mouse.move(Math.max(8, earthBox.x + earthBox.width * 0.24), Math.min(earthBox.y + earthBox.height * 0.54, 900));
  const localBodyHoverStart = await readFrames();
  await page.waitForTimeout(500);
  const localBodyHoverEnd = await readFrames();
  expect(localBodyHoverEnd.local - localBodyHoverStart.local, "local body hover should not animate local body").toBeLessThanOrEqual(1);

  await page.locator(".navigate-route-row--local .navigate-tab").hover();
  const localHoverStart = await readFrames();
  await page.waitForTimeout(900);
  const localHoverEnd = await readFrames();
  expect(localHoverEnd.local - localHoverStart.local, "local button hover should animate local body").toBeGreaterThanOrEqual(2);
  expect(localHoverEnd.local - localHoverStart.local, "local button hover should respect earth FPS cap").toBeLessThanOrEqual(18);
  expect(localHoverEnd.online - localHoverStart.online, "local hover should not animate online body").toBeLessThanOrEqual(1);

  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);
  const localAfterLeaveStart = await readFrames();
  await page.waitForTimeout(500);
  const localAfterLeaveEnd = await readFrames();
  expect(localAfterLeaveEnd.local - localAfterLeaveStart.local, "local body should stop animating after button hover leaves").toBeLessThanOrEqual(1);

  await page.locator(".navigate-link-field--online canvas").hover();
  const onlineBodyHoverStart = await readFrames();
  await page.waitForTimeout(500);
  const onlineBodyHoverEnd = await readFrames();
  expect(onlineBodyHoverEnd.online - onlineBodyHoverStart.online, "online body hover should not animate online body").toBeLessThanOrEqual(1);

  await page.locator(".navigate-route-row--online .navigate-tab").hover({ force: true });
  const onlineHoverStart = await readFrames();
  await page.waitForTimeout(900);
  const onlineHoverEnd = await readFrames();
  expect(onlineHoverEnd.online - onlineHoverStart.online, "online button hover should animate online body").toBeGreaterThanOrEqual(2);
  expect(onlineHoverEnd.local - onlineHoverStart.local, "online hover should not animate local body").toBeLessThanOrEqual(1);
});

for (const viewport of LANDING_COMPOSITION_VIEWPORTS.filter(({ name }) => name !== "1080p-browser-content")) {
  test(`navigate composition keeps bodies paired with controls at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/navigate", viewport);

    const viewportBounds = viewportBox(viewport);
    const header = await rect(page, ".navigate-scene__header");
    const title = await rect(page, ".navigate-scene__header h1");
    const routeStack = await rect(page, ".navigate-route-stack");
    const localButton = await rect(page, ".navigate-route-row--local .navigate-tab");
    const onlineButton = await rect(page, ".navigate-route-row--online .navigate-tab");
    const exitButton = await rect(page, ".navigate-route-row--exit .navigate-tab");
    const earth = await rect(page, ".navigate-earth-viewport-layer .navigate-globe-canvas");
    const moon = await rect(page, ".navigate-link-field--online .navigate-globe-canvas");
    const backdrop = await rect(page, ".navigate-grid-backdrop");
    const localLineEndpoint = await routeLineEndpoint(page, ".navigate-route-line--local", ".navigate-route-row--local .navigate-tab", "left");
    const onlineLineEndpoint = await routeLineEndpoint(page, ".navigate-route-line--online", ".navigate-route-row--online .navigate-tab", "right");

    expectInside(viewportBounds, header, "navigate header");
    expectInside(viewportBounds, title, "navigate title");
    expectInside(viewportBounds, routeStack, "navigate route stack");
    expect(title.y + title.height, "title should stay above route controls").toBeLessThanOrEqual(routeStack.y - 32);
    expect(exitButton.y, "exit should sit below primary route controls").toBeGreaterThan(localButton.y + localButton.height);

    expect(backdrop.x, `${viewport.name} backdrop should extend past left edge`).toBeLessThanOrEqual(-viewport.width * 0.08);
    expect(backdrop.y, `${viewport.name} backdrop should extend past top edge`).toBeLessThanOrEqual(-viewport.height * 0.08);
    expect(backdrop.x + backdrop.width, `${viewport.name} backdrop should extend past right edge`).toBeGreaterThanOrEqual(viewport.width * 1.08);
    expect(backdrop.y + backdrop.height, `${viewport.name} backdrop should extend past bottom edge`).toBeGreaterThanOrEqual(viewport.height * 1.08);

    expect(Math.abs(earth.width - earth.height), `${viewport.name} earth should render as a square sphere box`).toBeLessThanOrEqual(2);
    expect(Math.abs(moon.width - moon.height), `${viewport.name} moon should render as a square sphere box`).toBeLessThanOrEqual(2);
    expect(earth.width, `${viewport.name} local earth should anchor the lower-left page`).toBeGreaterThanOrEqual(viewport.width * 0.4);
    expect(earth.width, `${viewport.name} local earth should not swallow the full page`).toBeLessThanOrEqual(viewport.width * 0.6);
    expect(moon.width, `${viewport.name} online moon should feel planetary`).toBeGreaterThanOrEqual(viewport.width * 0.24);
    expect(moon.width, `${viewport.name} online moon should stay paired to online button`).toBeLessThanOrEqual(viewport.width * 0.34);

    const localButtonCenterX = localButton.x + localButton.width / 2;
    const localButtonCenterY = localButton.y + localButton.height / 2;
    const earthCenterX = earth.x + earth.width / 2;
    const earthCenterY = earth.y + earth.height / 2;
    expect(earth.x, `${viewport.name} earth should tuck past the left viewport edge`).toBeLessThanOrEqual(0);
    expect(earth.y + earth.height, `${viewport.name} earth should reach past the viewport bottom before masking`).toBeGreaterThanOrEqual(viewport.height * 1.05);
    expect(earthCenterX, `${viewport.name} earth should stay in the left orbital lane`).toBeLessThan(viewport.width * 0.32);
    expect(earthCenterX, `${viewport.name} earth center should sit left of local controls`).toBeLessThan(localButtonCenterX);
    expect(earthCenterY, `${viewport.name} earth should sit below local controls without disappearing into the fold`).toBeGreaterThan(localButtonCenterY + viewport.height * 0.28);
    expect(Math.abs(localButtonCenterX - earthCenterX), `${viewport.name} local button should stay paired with earth`).toBeLessThanOrEqual(viewport.width * 0.34);
    expectPointInside(earth, localLineEndpoint, `${viewport.name} local route line endpoint`);
    expect(localLineEndpoint.x, `${viewport.name} local route line should target the earth body`).toBeLessThanOrEqual(earth.x + earth.width * 0.62);
    expect(Math.hypot(localLineEndpoint.x - earthCenterX, localLineEndpoint.y - earthCenterY), `${viewport.name} local route line endpoint should land near earth`).toBeLessThanOrEqual(earth.width * 0.48);

    const onlineButtonCenterX = onlineButton.x + onlineButton.width / 2;
    const onlineButtonCenterY = onlineButton.y + onlineButton.height / 2;
    const moonCenterX = moon.x + moon.width / 2;
    const moonCenterY = moon.y + moon.height / 2;
    expect(moonCenterX, `${viewport.name} moon should stay in the right orbital lane`).toBeGreaterThan(viewport.width * 0.58);
    expect(moonCenterY, `${viewport.name} moon should sit above online controls`).toBeLessThan(onlineButtonCenterY);
    expect(moon.y + moon.height, `${viewport.name} moon should overlap the online control band`).toBeGreaterThanOrEqual(onlineButton.y);
    expect(Math.abs(onlineButtonCenterX - moonCenterX), `${viewport.name} online button should stay paired with moon`).toBeLessThanOrEqual(viewport.width * 0.26);
    expectPointInside(moon, onlineLineEndpoint, `${viewport.name} online route line endpoint`);
    expect(onlineLineEndpoint.x, `${viewport.name} online route line should target moon right lane`).toBeGreaterThanOrEqual(moonCenterX);
    expect(Math.hypot(onlineLineEndpoint.x - moonCenterX, onlineLineEndpoint.y - moonCenterY), `${viewport.name} online route line endpoint should land near moon`).toBeLessThanOrEqual(moon.width * 0.36);
  });
}

test("landing keeps proportional composition between 1080p and 1440p", async ({ page }) => {
  const reference = await landingRatios(page, { name: "qhd-effective", width: 2560, height: 1440 });
  const current = await landingRatios(page, { name: "1080p", width: 1920, height: 1080 });

  for (const key of Object.keys(reference)) {
    expectCloseRatio(current[key], reference[key], key);
  }
});

for (const viewport of AUDIO_DIALOG_VIEWPORTS) {
  test(`audio console fits inside viewport at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/", viewport);
    await page.getByRole("button", { name: /open audio console/i }).click();
    await expect(page.locator('[data-slot="dialog-content"].audio-dialog')).toBeVisible();
    await page.waitForTimeout(250);

    const viewportBounds = viewportBox(viewport);
    const dialog = await rect(page, '[data-slot="dialog-content"].audio-dialog');
    const albumArt = await rect(page, ".audio-dialog__album-art");
    const controls = await rect(page, ".audio-dialog__controls");
    const trackList = await rect(page, ".audio-dialog__track-list");
    const trackScroller = await rect(page, ".audio-dialog__track-scroller");

    expectInside(viewportBounds, dialog, "audio dialog");
    expectInside(dialog, albumArt, "audio album art");
    expectInside(dialog, controls, "audio controls");
    expectInside(dialog, trackList, "audio track list");
    expectInside(trackList, trackScroller, "audio track scroller");

    const scrollerMetrics = await page.locator(".audio-dialog__track-scroller").evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));
    expect(scrollerMetrics.clientHeight, "audio track scroller should have usable height").toBeGreaterThan(80);
    expect(scrollerMetrics.scrollHeight, "audio track scroller should own library overflow").toBeGreaterThanOrEqual(scrollerMetrics.clientHeight);
  });
}

for (const viewport of VIEWPORTS) {
  test(`online route game surface scales at ${viewport.name}`, async ({ page }) => {
    await openRoute(page, "/online", viewport, { authenticated: true });
    await expect(page.locator("#game-root .lobby")).toBeVisible();
    const { root } = await expectGameSurface(page);
    for (const selector of [".lobby", ".lobby-form", ".holo-keyboard-panel"]) {
      const target = page.locator(`#game-root ${selector}`).first();
      if ((await target.count()) > 0) expectInside(root, await target.boundingBox(), selector);
    }
    await expectNoHorizontalOverflow(page, "#game-root");
  });
}

test("not found route does not overflow", async ({ page }) => {
  await openRoute(page, "/route-that-does-not-exist", { width: 800, height: 600 });
  await expectNoPageHorizontalOverflow(page);
  await expect(page.getByText(/404|not found/i).first()).toBeVisible();
});
