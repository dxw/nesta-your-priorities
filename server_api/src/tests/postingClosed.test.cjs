"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { isPostingClosed } = require("../utils/postingClosed.cjs");

test("posting is closed when the group turns off new posts", () => {
  assert.equal(isPostingClosed({ configuration: { canAddNewPosts: false } }), true);
});

test("posting is open when the group allows new posts", () => {
  assert.equal(isPostingClosed({ configuration: { canAddNewPosts: true } }), false);
});

test("posting is open when the setting has never been saved", () => {
  assert.equal(isPostingClosed({ configuration: {} }), false);
  assert.equal(isPostingClosed({}), false);
});

test("a missing group is left to the existing handling", () => {
  assert.equal(isPostingClosed(null), false);
});
