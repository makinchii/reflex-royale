const crypto = require("node:crypto");
const { expect } = require("@playwright/test");

const FIT_TOLERANCE = 2;
const ASPECT_TOLERANCE = 0.025;
const SESSION_SECRET = process.env.SESSION_SECRET || "reflex-royale-dev-secret";

const VIEWPORTS = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet-4-3", width: 1024, height: 768 },
  { name: "short", width: 800, height: 600 },
];

const ROUTE_VIEWPORTS = [
  ...VIEWPORTS,
  { name: "mobile", width: 390, height: 844 },
];

async function rect(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a layout box`).not.toBeNull();
  return box;
}

function expectInside(parent, child, label) {
  expect(child.x, `${label} left edge`).toBeGreaterThanOrEqual(parent.x - FIT_TOLERANCE);
  expect(child.y, `${label} top edge`).toBeGreaterThanOrEqual(parent.y - FIT_TOLERANCE);
  expect(child.x + child.width, `${label} right edge`).toBeLessThanOrEqual(parent.x + parent.width + FIT_TOLERANCE);
  expect(child.y + child.height, `${label} bottom edge`).toBeLessThanOrEqual(parent.y + parent.height + FIT_TOLERANCE);
}

async function expectNoHorizontalOverflow(page, selector) {
  const overflow = await page.locator(selector).first().evaluate((node) => node.scrollWidth - node.clientWidth);
  expect(overflow, `${selector} should not overflow horizontally`).toBeLessThanOrEqual(1);
}

async function expectNoPageHorizontalOverflow(page) {
  await expectNoHorizontalOverflow(page, "html");
  await expectNoHorizontalOverflow(page, "body");
}

async function expectInViewportAfterScroll(page, selector) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  const viewport = page.viewportSize();
  const box = await locator.boundingBox();
  expect(box, `${selector} should have a layout box`).not.toBeNull();
  expect(box.x, `${selector} visible left edge`).toBeGreaterThanOrEqual(-FIT_TOLERANCE);
  expect(box.x + box.width, `${selector} visible right edge`).toBeLessThanOrEqual(viewport.width + FIT_TOLERANCE);
  expect(box.y + Math.min(box.height, viewport.height), `${selector} visible vertical edge`).toBeGreaterThanOrEqual(0);
}

async function expectClickable(page, selector) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeEnabled();
}

async function expectGameSurface(page) {
  await expect(page.locator("#game-root")).toBeVisible();
  const stage = await rect(page, '[data-wait-for-game-ready="true"]');
  const root = await rect(page, "#game-root");
  const aspect = stage.width / stage.height;

  expect(Math.abs(aspect - 16 / 9), "game stage should stay 16:9").toBeLessThanOrEqual(ASPECT_TOLERANCE);
  expectInside(stage, root, "game root");
  await expectNoPageHorizontalOverflow(page);
  await expectNoHorizontalOverflow(page, "#game-root");

  return { root, stage };
}

function signAuthUser(user) {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

async function authenticate(page) {
  const value = signAuthUser({
    username: "VisualBot",
    bestScore: 142,
    preferredThemeCommand: "tron",
    preferredThemeColor: "#00d4ff",
    preferredThemeShades: { tron: "#00d4ff" },
  });
  await page.goto("/");
  await page.evaluate((cookieValue) => {
    document.cookie = `reflexRoyaleAuth=${cookieValue}; path=/; samesite=lax`;
  }, value);
}

async function openRoute(page, route, viewport, { authenticated = false } = {}) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  if (authenticated) await authenticate(page);
  await page.goto(route);
}

module.exports = {
  FIT_TOLERANCE,
  ROUTE_VIEWPORTS,
  VIEWPORTS,
  authenticate,
  expectClickable,
  expectGameSurface,
  expectInViewportAfterScroll,
  expectInside,
  expectNoHorizontalOverflow,
  expectNoPageHorizontalOverflow,
  openRoute,
  rect,
};
