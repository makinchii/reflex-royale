const assert = require("assert/strict");
const test = require("node:test");

const { KEYBOARD_ROWS, isAllowedGameKey, normalizeGameKey } = require("../lib/gameKeys.cjs");

test("normalizes shifted character keys to their non-shifted game key", () => {
  assert.equal(normalizeGameKey("A"), "a");
  assert.equal(normalizeGameKey("!"), "1");
  assert.equal(normalizeGameKey("?"), "/");
  assert.equal(normalizeGameKey("+"), "=");
  assert.equal(normalizeGameKey("_"), "-");
  assert.equal(normalizeGameKey("|"), "\\");
});

test("only displayed character keys are allowed", () => {
  assert.equal(isAllowedGameKey("a"), true);
  assert.equal(isAllowedGameKey("!"), true);
  assert.equal(isAllowedGameKey("Enter"), false);
  assert.equal(isAllowedGameKey(" "), false);
  assert.equal(isAllowedGameKey("ArrowLeft"), false);
  assert.equal(KEYBOARD_ROWS.flat().includes(" "), false);
});
