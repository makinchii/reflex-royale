const { expect, test } = require("@playwright/test");
const { VIEWPORTS, expectGameSurface, expectInside, expectNoHorizontalOverflow, openRoute, rect } = require("./helpers/layout");

async function openLocal(page, viewport) {
  await openRoute(page, "/local", viewport);
  await expect(page.locator("#game-root .lobby")).toBeVisible();
  await expectGameSurface(page);
}

async function addLocalPlayer(page, name, key) {
  await page.locator("#playerName").fill(name);
  await page.locator("#playerKey").fill(key);
  await page.locator("#addPlayerBtn").click();
}

async function startFourPlayerArena(page) {
  await addLocalPlayer(page, "Ada", "q");
  await addLocalPlayer(page, "Ben", "w");
  await addLocalPlayer(page, "Cy", "e");
  await addLocalPlayer(page, "Dee", "r");
  await expect(page.locator("#game-root .player-slot")).toHaveCount(4);
  await page.locator("body").click({ position: { x: 10, y: 10 } });
  for (const key of ["q", "w", "e", "r"]) {
    await page.keyboard.press(key);
  }
  await expect(page.locator("#startGameBtn")).toBeEnabled();
  await page.locator("#startGameBtn").click();
  await expect(page.locator("#game-root .arena.grid-4")).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`local lobby fits 16:9 surface at ${viewport.name}`, async ({ page }) => {
    await openLocal(page, viewport);
    const { root } = await expectGameSurface(page);

    for (const selector of [".lobby", ".lobby-form", ".holo-keyboard-panel", ".player-slots", ".lobby-layout-bottom"]) {
      const target = page.locator(`#game-root ${selector}`).first();
      if ((await target.count()) > 0) {
        expectInside(root, await target.boundingBox(), selector);
      }
    }
  });

  test(`local 4-player arena fits 16:9 surface at ${viewport.name}`, async ({ page }) => {
    await openLocal(page, viewport);
    await startFourPlayerArena(page);
    const { root } = await expectGameSurface(page);

    expectInside(root, await rect(page, "#game-root .arena"), "arena");
    await expect(page.locator("#game-root .player-panel")).toHaveCount(4);

    for (const panel of await page.locator("#game-root .player-panel").all()) {
      expectInside(root, await panel.boundingBox(), "player panel");
    }

    expectInside(root, await rect(page, "#game-root .center-overlay"), "center overlay");
    await expectNoHorizontalOverflow(page, "#game-root");
  });
}
