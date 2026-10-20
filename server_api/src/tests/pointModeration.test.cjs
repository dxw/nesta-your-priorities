"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const modelsPath = path.resolve(__dirname, "../models/index.cjs");
const queuePath = require.resolve("../services/workers/queue.cjs");
const loggerPath = require.resolve("../utils/logger.cjs");
const anonymousUserPath = require.resolve(
  "../services/utils/get_anonymous_system_user.cjs"
);
const moderationItemsPath = require.resolve(
  "../services/engine/moderation/get_moderation_items.cjs"
);
const recountUtilsPath = require.resolve("../utils/recount_utils.cjs");
const moderationWorkerPath = require.resolve(
  "../services/engine/moderation/process_moderation_items.cjs"
);
const pointControllerPath = require.resolve("../controllers/points.cjs");
const authorizationPath = require.resolve("../authorization.cjs");
const toJsonPath = require.resolve("../utils/to_json.cjs");
const fingerprintDataPath = require.resolve("../utils/fingerprint_data.cjs");
const speechToTextSupportPath = require.resolve(
  "../utils/speechToTextSupport.cjs"
);
const expressPath = require.resolve("express");
const openGraphScraperPath = require.resolve("open-graph-scraper");

const injectMockModule = (modulePath, moduleExports) => {
  const mockModule = new Module(modulePath);
  mockModule.filename = modulePath;
  mockModule.loaded = true;
  mockModule.exports = moduleExports;
  require.cache[modulePath] = mockModule;
};

const createPoint = (overrides = {}) => ({
  id: 1,
  status: "in_moderation_queue",
  content_type: 0,
  parent_point_id: null,
  post_id: 10,
  group_id: 5,
  user_id: 20,
  deleted: false,
  save: async function () {
    return this;
  },
  ...overrides,
});

const loadModerationWorker = (options = {}) => {
  const originalResolveFilename = Module._resolveFilename;
  const modulePaths = [
    modelsPath,
    queuePath,
    loggerPath,
    anonymousUserPath,
    moderationItemsPath,
    recountUtilsPath,
    moderationWorkerPath,
  ];
  const originals = new Map(
    modulePaths.map((modulePath) => [modulePath, require.cache[modulePath]])
  );
  const calls = {
    activities: [],
    queue: [],
    postIncrements: [],
    externalCounterUpdates: [],
    pointUpdates: [],
    postRecounts: [],
    communityRecounts: [],
  };
  const points = options.points || [createPoint(options.point)];
  const findPoint = (id) => points.find((point) => point.id === id);
  const post = {
    updateAllExternalCounters(req, direction, column, callback) {
      calls.externalCounterUpdates.push({ req, direction, column });
      callback();
    },
    increment(column) {
      calls.postIncrements.push(column);
      return Promise.resolve(this);
    },
  };
  const models = {
    Point: {
      CONTENT_DEBATE: 0,
      unscoped() {
        return {
          findOne: async ({ where }) => findPoint(where.id),
          findAll: async ({ where = {} } = {}) => points.filter((point) => {
            const idCondition = where.id;
            const idList = idCondition && (
              idCondition.$in || idCondition[models.Sequelize.Op.in]
            );
            if (idList && !idList.includes(point.id)) return false;
            if (where.status && point.status !== where.status) return false;
            if (
              where.content_type !== undefined &&
              point.content_type !== where.content_type
            ) return false;
            if (
              where.parent_point_id === null &&
              point.parent_point_id !== null
            ) return false;
            const postIdNotEqual = where.post_id &&
              where.post_id[models.Sequelize.Op.ne];
            if (postIdNotEqual === null && point.post_id === null) return false;
            return true;
          }),
          update: async (values, query) => {
            calls.pointUpdates.push({ values, query });
            for (const point of points) {
              if (query.where.id.$in.includes(point.id)) {
                Object.assign(point, values);
              }
            }
            return [query.where.id.$in.length];
          },
        };
      },
    },
    Post: {
      findOne: async () => post,
    },
    Group: {
      findOne: async () => ({ id: 5, community_id: 6 }),
    },
    AcActivity: {
      ACCESS_PUBLIC: 0,
      createActivity(activity, callback) {
        calls.activities.push(activity);
        callback(options.activityError);
      },
    },
    Sequelize: {
      Op: {
        in: Symbol.for("sequelize.in"),
        ne: Symbol.for("sequelize.ne"),
      },
    },
  };

  injectMockModule(modelsPath, models);
  injectMockModule(queuePath, {
    add(...args) {
      calls.queue.push(args);
    },
  });
  injectMockModule(loggerPath, {
    error() {},
    info() {},
    warn() {},
  });
  injectMockModule(anonymousUserPath, (callback) => {
    callback(null, { id: 99 });
  });
  injectMockModule(moderationItemsPath, {
    domainIncludes: () => [],
    communityIncludes: () => [],
    groupIncludes: () => [],
    userIncludes: () => [],
  });
  injectMockModule(recountUtilsPath, {
    recountCommunity(communityId, callback) {
      calls.communityRecounts.push(communityId);
      callback();
    },
    recountPosts(postIds, callback) {
      calls.postRecounts.push(postIds);
      callback();
    },
  });

  Module._resolveFilename = function (request, parent, isMain, resolveOptions) {
    if (request.endsWith("models/index.cjs")) {
      return modelsPath;
    }
    return originalResolveFilename.call(
      this,
      request,
      parent,
      isMain,
      resolveOptions
    );
  };
  delete require.cache[moderationWorkerPath];
  const moderationWorker = require(moderationWorkerPath);

  return {
    assert,
    calls,
    models,
    moderationWorker,
    points,
    restore() {
      Module._resolveFilename = originalResolveFilename;
      for (const [modulePath, originalModule] of originals) {
        if (originalModule) {
          require.cache[modulePath] = originalModule;
        } else {
          delete require.cache[modulePath];
        }
      }
    },
  };
};

const runSingleModerationAction = (moderationWorker, options) =>
  new Promise((resolve) => {
    const response = {};
    response.sendStatus = (status) => {
      response.status = status;
      resolve(response);
    };
    moderationWorker.performSingleModerationAction(
      {},
      response,
      {
        groupId: 5,
        itemId: options.itemId || 1,
        itemType: "point",
        actionType: "approve",
      }
    );
  });

const runBulkModerationAction = (moderationWorker, items) =>
  new Promise((resolve, reject) => {
    moderationWorker.performManyModerationActions(
      {
        items,
        actionType: "approve",
        groupId: 5,
      },
      (error) => error ? reject(error) : resolve()
    );
  });

const loadPointController = () => {
  const originalResolveFilename = Module._resolveFilename;
  const modulePaths = [
    modelsPath,
    queuePath,
    loggerPath,
    pointControllerPath,
    authorizationPath,
    toJsonPath,
    fingerprintDataPath,
    speechToTextSupportPath,
    expressPath,
    openGraphScraperPath,
  ];
  const originals = new Map(
    modulePaths.map((modulePath) => [modulePath, require.cache[modulePath]])
  );
  const calls = {
    activities: [],
    groupMemberships: [],
    pointRevisions: [],
    pointSaves: [],
    postLookups: [],
    postCounterUpdates: [],
    queue: [],
    response: undefined,
    scopedPointLookups: 0,
    unscopedPointLookups: 0,
  };
  const routes = [];
  const savedPoints = [];
  const router = {};
  for (const method of ["get", "post", "put", "delete"]) {
    router[method] = (...args) => {
      routes.push({ method, path: args[0], handlers: args.slice(1) });
    };
  }

  const pointModel = {
    build(attributes) {
      const point = {
        id: 42,
        ...attributes,
        save: async function () {
          calls.pointSaves.push(this);
          return this;
        },
        setDataValue(key, value) {
          this[key] = value;
        },
      };
      savedPoints.push(point);
      return point;
    },
    findOne: async () => {
      calls.scopedPointLookups += 1;
      return savedPoints[0];
    },
    unscoped() {
      return {
        findOne: async () => {
          calls.unscopedPointLookups += 1;
          return savedPoints[0];
        },
      };
    },
    getVideosForPoints(_pointIds, callback) {
      callback(null, []);
    },
    setOrganizationUsersForPoints(_points, callback) {
      callback();
    },
  };
  const models = {
    Point: pointModel,
    PointRevision: {
      build(attributes) {
        const revision = {
          ...attributes,
          save: async function () {
            calls.pointRevisions.push(this);
            return this;
          },
        };
        return revision;
      },
    },
    Group: {
      addUserToGroupIfNeeded(groupId, _req, callback) {
        calls.groupMemberships.push(groupId);
        callback();
      },
    },
    AcActivity: {
      ACCESS_PUBLIC: 0,
      createActivity(activity, callback) {
        calls.activities.push(activity);
        callback();
      },
    },
    Post: {
      findOne: async () => {
        calls.postLookups.push(true);
        return {
          updateAllExternalCounters(_req, direction, column, callback) {
            calls.postCounterUpdates.push({ direction, column });
            callback();
          },
          increment: async () => {},
        };
      },
    },
  };

  injectMockModule(modelsPath, models);
  injectMockModule(queuePath, {
    add(...args) {
      calls.queue.push(args);
    },
  });
  injectMockModule(loggerPath, {
    error() {},
    info() {},
    warn() {},
  });
  injectMockModule(authorizationPath, {
    can: () => () => {},
    isLoggedInNoAnonymousCheck: () => () => {},
  });
  injectMockModule(toJsonPath, () => ({}));
  injectMockModule(fingerprintDataPath, {
    getFingerprintDataFromBody: () => ({}),
  });
  injectMockModule(speechToTextSupportPath, {
    getSpeechToTextSupportConfig: () => ({}),
    hasSpeechToTextSupport: () => false,
  });
  injectMockModule(expressPath, {
    Router: () => router,
  });
  injectMockModule(openGraphScraperPath, async () => ({}));

  Module._resolveFilename = function (request, parent, isMain, resolveOptions) {
    if (request === "../models/index.cjs") return modelsPath;
    if (request === "../authorization.cjs") return authorizationPath;
    if (request === "../utils/logger.cjs") return loggerPath;
    if (request === "../utils/to_json.cjs") return toJsonPath;
    if (request === "../utils/fingerprint_data.cjs") return fingerprintDataPath;
    if (request === "../utils/speechToTextSupport.cjs") return speechToTextSupportPath;
    if (request === "../services/workers/queue.cjs") return queuePath;
    if (request === "express") return expressPath;
    if (request === "open-graph-scraper") return openGraphScraperPath;
    return originalResolveFilename.call(
      this,
      request,
      parent,
      isMain,
      resolveOptions
    );
  };
  delete require.cache[pointControllerPath];
  require(pointControllerPath);

  return {
    calls,
    routes,
    savedPoints,
    restore() {
      Module._resolveFilename = originalResolveFilename;
      for (const [modulePath, originalModule] of originals) {
        if (originalModule) {
          require.cache[modulePath] = originalModule;
        } else {
          delete require.cache[modulePath];
        }
      }
    },
  };
};

test("post point creation queues existing-post responses without publishing them", async (t) => {
  const { calls, routes, savedPoints, restore } = loadPointController();
  t.after(restore);

  const createPointRoute = routes.find(
    (route) => route.method === "post" && route.path === "/:groupId"
  );
  assert.ok(createPointRoute, "point creation route should be registered");

  let response;
  let responseStatus;
  const completion = new Promise((resolve) => {
    const req = {
      body: {
        postId: 10,
        content: "A typed response",
        value: 1,
      },
      params: { groupId: "5" },
      user: {
        id: 20,
        simple() {
          return { id: this.id };
        },
      },
      useragent: { source: "test-agent" },
      clientIp: "127.0.0.1",
      headers: {},
      ypDomain: { id: 3 },
      redisClient: { setEx() {} },
    };
    const res = {
      send(point) {
        response = point;
        resolve();
      },
      sendStatus(status) {
        responseStatus = status;
        resolve();
      },
    };

    createPointRoute.handlers.at(-1)(req, res);
  });

  await completion;

  assert.equal(responseStatus, undefined);
  assert.equal(savedPoints.length, 1);
  assert.equal(savedPoints[0].status, "in_moderation_queue");
  assert.equal(calls.pointRevisions[0].status, "in_moderation_queue");
  assert.equal(response, savedPoints[0]);
  assert.equal(calls.scopedPointLookups, 0);
  assert.equal(calls.unscopedPointLookups, 1);
  assert.deepEqual(calls.activities, []);
  assert.deepEqual(calls.postCounterUpdates, []);
  assert.deepEqual(calls.postLookups, []);
  assert.equal(
    calls.queue.some(([queueName, work]) =>
      queueName === "process-similarities" && work.pointId === savedPoints[0].id
    ),
    false
  );
});

test("single approval publishes a queued post point and restores public side effects", async (t) => {
  const { calls, moderationWorker, points, restore } = loadModerationWorker();
  t.after(restore);

  const response = await runSingleModerationAction(moderationWorker, {});

  assert.equal(response.status, 200);
  assert.equal(points[0].status, "published");
  assert.deepEqual(calls.activities, [{
    type: "activity.point.new",
    userId: points[0].user_id,
    groupId: points[0].group_id,
    postId: points[0].post_id,
    pointId: points[0].id,
    access: 0,
  }]);
  assert.deepEqual(calls.externalCounterUpdates, [{
    req: {},
    direction: "up",
    column: "counter_points",
  }]);
  assert.deepEqual(calls.postIncrements, ["counter_points"]);
  assert.ok(calls.queue.some(([name, payload]) =>
    name === "process-similarities" && payload.pointId === points[0].id
  ));
});

test("bulk approval publishes queued post points and recounts affected posts", async (t) => {
  const queuedPoint = createPoint({ id: 1, post_id: 10 });
  const alreadyPublishedPoint = createPoint({
    id: 2,
    status: "published",
    post_id: 20,
  });
  const { calls, moderationWorker, points, restore } = loadModerationWorker({
    points: [queuedPoint, alreadyPublishedPoint],
  });
  t.after(restore);

  await runBulkModerationAction(moderationWorker, points.map((point) => ({
    id: point.id,
    modelType: "point",
  })));

  assert.deepEqual(points.map((point) => point.status), ["published", "published"]);
  assert.deepEqual(calls.activities.map((activity) => activity.pointId), [1]);
  assert.deepEqual(calls.postRecounts, [[10]]);
  assert.deepEqual(calls.communityRecounts, [6]);
  assert.equal(calls.queue.filter(([name]) => name === "process-similarities").length, 2);
});

test("approval preserves existing behavior for comments and other point types", async (t) => {
  const nonDebatePoints = [
    createPoint({ id: 1, content_type: 2, parent_point_id: 99 }),
    createPoint({ id: 2, content_type: 1 }),
    createPoint({ id: 3, post_id: null }),
  ];

  for (const point of nonDebatePoints) {
    const { calls, moderationWorker, points, restore } = loadModerationWorker({
      point,
    });
    try {
      const response = await runSingleModerationAction(moderationWorker, {
        itemId: point.id,
      });
      assert.equal(response.status, 200);
      assert.equal(points[0].status, "published");
      assert.deepEqual(calls.activities, []);
      assert.deepEqual(calls.externalCounterUpdates, []);
      assert.deepEqual(calls.postIncrements, []);
    } finally {
      restore();
    }
  }
});

test("keeps a point queued when public activity creation fails", async (t) => {
  const { calls, moderationWorker, points, restore } = loadModerationWorker({
    activityError: new Error("activity queue unavailable"),
  });
  t.after(restore);

  const response = await runSingleModerationAction(moderationWorker, {});

  assert.equal(response.status, 500);
  assert.equal(points[0].status, "in_moderation_queue");
  assert.equal(calls.postIncrements.length, 0);
  assert.equal(
    calls.queue.some(([name, payload]) =>
      name === "process-similarities" && payload.pointId === points[0].id
    ),
    false
  );
});

module.exports = { createPoint, loadModerationWorker };