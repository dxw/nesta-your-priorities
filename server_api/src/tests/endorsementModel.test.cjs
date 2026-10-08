"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const modelFactory = require("../models/endorsement.cjs");

const fakeSequelize = {
  define: (_name, attributes, options) => ({
    attributes,
    options,
  }),
};

test("endorsement model enforces a single active vote per user per post", () => {
  const model = modelFactory(fakeSequelize, {});
  const activeUserPostIndex = model.options.indexes.find(
    (index) => JSON.stringify(index.fields) === JSON.stringify(["user_id", "post_id"])
  );

  assert.ok(activeUserPostIndex, "should define a user_id + post_id index");
  assert.equal(activeUserPostIndex.unique, true, "should be unique for active rows");
  assert.deepEqual(activeUserPostIndex.where, { deleted: false });
});
