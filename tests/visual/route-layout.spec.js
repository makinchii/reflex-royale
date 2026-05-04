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

function viewportBox(viewport) {
  return { x: 0, y: 0, width: viewport.width, height: viewport.height };
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
    const hero = await rect(page, ".landing-hero-card");
    const title = await rect(page, ".landing-title-lockup");
    const actions = await rect(page, ".landing-action-row");
    const leaderboard = await rect(page, ".landing-leaderboard-terminal");
    const footer = await rect(page, ".landing-footer-text");

    expectInside(viewportBounds, hero, "landing hero");
    expectInside(viewportBounds, actions, "landing actions");
    expectInside(viewportBounds, leaderboard, "landing leaderboard");
    expectInside(viewportBounds, footer, "landing footer");

    expect(title.height, "landing title should not dominate viewport height").toBeLessThanOrEqual(viewport.height * 0.31);
    expect(hero.y + hero.height, "actions should sit below hero").toBeLessThanOrEqual(actions.y - 8);
    expect(actions.y + actions.height, "leaderboard should sit below actions").toBeLessThanOrEqual(leaderboard.y - 8);
    expect(leaderboard.y + leaderboard.height, "footer should not overlap leaderboard").toBeLessThanOrEqual(footer.y - 8);

    const stack = await rect(page, ".landing-content-stack");
    const terminal = await rect(page, ".landing-terminal");
    const radar = await rect(page, ".landing-radar");
    const location = await rect(page, ".landing-location");

    expect(terminal.x + terminal.width, "left decor should stay outside the central stack").toBeLessThanOrEqual(stack.x - 16);
    expect(radar.x, "radar decor should stay outside the central stack").toBeGreaterThanOrEqual(stack.x + stack.width + 16);
    expect(location.x, "right decor should stay outside the central stack").toBeGreaterThanOrEqual(stack.x + stack.width + 16);
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
