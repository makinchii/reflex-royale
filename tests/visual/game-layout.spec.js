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
        const targetRect = await target.boundingBox();
        if (targetRect) expectInside(root, targetRect, selector);
      }
    }
  });

  test(`local lobby is fully visible without initial scrolling at ${viewport.name}`, async ({ page }) => {
    await openLocal(page, viewport);
    const { root } = await expectGameSurface(page);

    const lobbyMetrics = await page.locator("#game-root .lobby").evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
    }));
    expect(lobbyMetrics.scrollTop, "lobby should load at top").toBe(0);
    expect(lobbyMetrics.scrollHeight - lobbyMetrics.clientHeight, "lobby should not need initial vertical scrolling").toBeLessThanOrEqual(1);
    expectInside(root, await rect(page, "#startGameBtn"), "start game button on initial lobby");
  });

  if (viewport.name === "1080p") {
    test("local lobby uses four fixed side player slots", async ({ page }) => {
      await openLocal(page, viewport);
      await addLocalPlayer(page, "Ada", "q");
      await addLocalPlayer(page, "Ben", "w");
      await addLocalPlayer(page, "Cy", "e");
      await addLocalPlayer(page, "Dee", "r");

      const { root } = await expectGameSurface(page);
      const form = await rect(page, "#game-root .lobby-form");
      const topLeft = await rect(page, "#game-root .player-slot-dock--top-left");
      const topRight = await rect(page, "#game-root .player-slot-dock--top-right");
      const bottomLeft = await rect(page, "#game-root .player-slot-dock--bottom-left");
      const bottomRight = await rect(page, "#game-root .player-slot-dock--bottom-right");

      await expect(page.locator("#game-root .player-slot")).toHaveCount(4);
      await expect(page.locator("#game-root .player-slot-dock--empty")).toHaveCount(0);
      for (const [label, slot] of [["top-left", topLeft], ["top-right", topRight], ["bottom-left", bottomLeft], ["bottom-right", bottomRight]]) {
        expectInside(root, slot, `player slot ${label}`);
      }
      expect(topLeft.x + topLeft.width, "top-left slot should stay left of the control card").toBeLessThanOrEqual(form.x + 2);
      expect(bottomLeft.x + bottomLeft.width, "bottom-left slot should stay left of the control card").toBeLessThanOrEqual(form.x + 2);
      expect(topRight.x, "top-right slot should stay right of the control card").toBeGreaterThanOrEqual(form.x + form.width - 2);
      expect(bottomRight.x, "bottom-right slot should stay right of the control card").toBeGreaterThanOrEqual(form.x + form.width - 2);
      expect(topLeft.y, "host slot should be above third-player slot").toBeLessThan(bottomLeft.y);
      expect(topRight.y, "second-player slot should be above fourth-player slot").toBeLessThan(bottomRight.y);
      for (const [label, slot] of [["top-left", topLeft], ["top-right", topRight], ["bottom-left", bottomLeft], ["bottom-right", bottomRight]]) {
        expect(slot.width / slot.height, `player slot ${label} should stay card-like`).toBeGreaterThanOrEqual(3.2);
      }
    });
  }

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
