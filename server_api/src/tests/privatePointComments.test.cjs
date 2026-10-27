"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ADMIN_ONLY_COMMENT_STATUS,
  isAdminOnlyComment,
  getPointSubmissionAttributes,
} = require("../utils/privatePointComments.cjs");

test("only admin-only comment records are private comments", () => {
  assert.equal(ADMIN_ONLY_COMMENT_STATUS, "admin_only");
  const models = { Point: { CONTENT_COMMENT: 2 } };

  assert.equal(
    isAdminOnlyComment(models, { content_type: 2, status: "admin_only" }),
    true
  );
  assert.equal(
    isAdminOnlyComment(models, { content_type: 2, status: "published" }),
    false
  );
  assert.equal(
    isAdminOnlyComment(models, { content_type: 0, status: "admin_only" }),
    false
  );
});

test("all post-linked points become private comments regardless of direction", () => {
  const Point = { CONTENT_DEBATE: 0, CONTENT_COMMENT: 2 };

  assert.deepEqual(getPointSubmissionAttributes(Point, 99), {
    content_type: Point.CONTENT_COMMENT,
    status: "admin_only",
  });
  assert.deepEqual(getPointSubmissionAttributes(Point, undefined, -1), {
    content_type: Point.CONTENT_DEBATE,
    status: "published",
  });
});