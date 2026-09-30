"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { hasNonOpenPosts } = require("../utils/groupPosts.cjs");

function fakeModels(row) {
  const calls = { scope: null, findOne: null, count: 0 };
  return {
    calls,
    Post: {
      scope(name) {
        calls.scope = name;
        return {
          findOne(options) { calls.findOne = options; return Promise.resolve(row); },
          count() { calls.count += 1; return Promise.resolve(0); },
        };
      },
    },
  };
}

test("answers true from the first matching row instead of counting them all", async () => {
  const models = fakeModels({ id: 42 });
  assert.equal(await hasNonOpenPosts(models, 1), true);
  assert.equal(models.calls.scope, "not_open");
  assert.equal(models.calls.count, 0, "count() must not be used");
  assert.deepEqual(models.calls.findOne.attributes, ["id"]);
  assert.deepEqual(models.calls.findOne.where, { group_id: 1 });
  assert.equal(models.calls.findOne.raw, true);
});

test("answers false when the group has no non-open posts", async () => {
  const models = fakeModels(null);
  assert.equal(await hasNonOpenPosts(models, "7"), false);
  assert.deepEqual(models.calls.findOne.where, { group_id: "7" });
});
