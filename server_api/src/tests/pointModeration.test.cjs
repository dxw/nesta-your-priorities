"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  initialPointStatus,
  isQueuedPostPoint,
  publishApprovedPostPoint,
} = require("../utils/pointModeration.cjs");

function fakeModels({ post = {}, group } = {}) {
  const calls = { activities: [], externalCounters: [], increments: [] };
  return {
    calls,
    AcActivity: {
      ACCESS_PUBLIC: 0,
      createActivity(options, callback) {
        calls.activities.push(options);
        callback();
      },
    },
    Community: {},
    Group: {
      findOne: async () =>
        group === undefined ? { id: 5, Community: { id: 6, domain_id: 3 } } : group,
    },
    Post: {
      findOne: async () =>
        post && {
          id: 10,
          updateAllExternalCounters(req, direction, column, done) {
            calls.externalCounters.push({ direction, column });
            done();
          },
          increment: async (column) => calls.increments.push(column),
          ...post,
        },
    },
  };
}

const queuedPoint = {
  id: 1,
  status: "in_moderation_queue",
  post_id: 10,
  group_id: 5,
  user_id: 20,
};

test("queues new points on posts and publishes points without a post", () => {
  assert.equal(initialPointStatus(10), "in_moderation_queue");
  assert.equal(initialPointStatus(undefined), "published");
});

test("only queued points on a post need publishing on approval", () => {
  assert.equal(isQueuedPostPoint(queuedPoint), true);
  assert.equal(isQueuedPostPoint({ ...queuedPoint, status: "published" }), false);
  assert.equal(isQueuedPostPoint({ ...queuedPoint, post_id: null }), false);
});

test("publishing an approved point creates its public activity and updates counters", async () => {
  const models = fakeModels();

  await publishApprovedPostPoint(models, { ypDomain: { id: 99 } }, queuedPoint);

  assert.deepEqual(models.calls.activities, [{
    type: "activity.point.new",
    userId: 20,
    domainId: 3,
    groupId: 5,
    postId: 10,
    pointId: 1,
    access: 0,
  }]);
  assert.deepEqual(models.calls.externalCounters, [{ direction: "up", column: "counter_points" }]);
  assert.deepEqual(models.calls.increments, ["counter_points"]);
});

test("publishing fails without an activity or counter change when the post is missing", async () => {
  const models = fakeModels({ post: null });

  await assert.rejects(
    publishApprovedPostPoint(models, {}, queuedPoint),
    /Post not found/
  );
  assert.deepEqual(models.calls.activities, []);
  assert.deepEqual(models.calls.increments, []);
});
