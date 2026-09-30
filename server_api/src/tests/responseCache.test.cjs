"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { cachedForAnonymous, invalidate, groupKey } = require("../utils/responseCache.cjs");

function fakeRedis(store = {}) {
  const calls = { setEx: [], del: [] };
  return {
    calls,
    store,
    get: async (k) => (k in store ? store[k] : null),
    setEx: async (k, ttl, v) => { calls.setEx.push({ k, ttl, v }); store[k] = v; },
    del: async (k) => { calls.del.push(k); delete store[k]; },
  };
}

function fakeRes() {
  const res = { statusCode: 200, sent: null, headers: {} };
  res.send = (body) => { res.sent = body; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

async function tick() { await new Promise((r) => setImmediate(r)); }

test("anonymous miss: the handler runs and its 200 response is stored for the TTL", async () => {
  const redis = fakeRedis();
  const req = { redisClient: redis, params: { id: "5" } };
  const res = fakeRes();
  let handlerRan = false;
  await new Promise((resolve) => cachedForAnonymous({ key: (r) => groupKey(r.params.id), ttl: 60 })(req, res, () => { handlerRan = true; resolve(); }));
  res.send({ group: { id: 5 }, hasNonOpenPosts: false });
  await tick();
  assert.ok(handlerRan);
  assert.deepEqual(res.sent, { group: { id: 5 }, hasNonOpenPosts: false });
  assert.equal(redis.calls.setEx.length, 1);
  assert.equal(redis.calls.setEx[0].k, "cache:group:v1:5");
  assert.equal(redis.calls.setEx[0].ttl, 60);
  assert.equal(JSON.parse(redis.calls.setEx[0].v).group.id, 5);
});

test("anonymous hit: the cached body is sent and the handler never runs", async () => {
  const redis = fakeRedis({ "cache:group:v1:5": JSON.stringify({ group: { id: 5 }, hasNonOpenPosts: true }) });
  const req = { redisClient: redis, params: { id: "5" } };
  const res = fakeRes();
  let handlerRan = false;
  cachedForAnonymous({ key: (r) => groupKey(r.params.id), ttl: 60 })(req, res, () => { handlerRan = true; });
  await tick();
  assert.equal(handlerRan, false);
  assert.deepEqual(res.sent, { group: { id: 5 }, hasNonOpenPosts: true });
  assert.equal(res.headers["X-App-Cache"], "hit");
});

test("logged-in requests bypass the cache entirely", async () => {
  const redis = fakeRedis({ "cache:group:v1:5": JSON.stringify({ group: { id: 5 } }) });
  const req = { redisClient: redis, user: { id: 1 }, params: { id: "5" } };
  const res = fakeRes();
  let handlerRan = false;
  cachedForAnonymous({ key: (r) => groupKey(r.params.id), ttl: 60 })(req, res, () => { handlerRan = true; });
  res.send({ group: { id: 5, adminOnly: true } });
  await tick();
  assert.ok(handlerRan);
  assert.equal(redis.calls.setEx.length, 0);
});

test("non-200 responses are not stored", async () => {
  const redis = fakeRedis();
  const req = { redisClient: redis, params: { id: "9" } };
  const res = fakeRes();
  await new Promise((resolve) => cachedForAnonymous({ key: (r) => groupKey(r.params.id), ttl: 60 })(req, res, resolve));
  res.statusCode = 404;
  res.send("Not found");
  await tick();
  assert.equal(redis.calls.setEx.length, 0);
});

test("a request without a Redis client passes straight through", () => {
  const req = { params: { id: "5" } };
  let handlerRan = false;
  cachedForAnonymous({ key: (r) => groupKey(r.params.id), ttl: 60 })(req, fakeRes(), () => { handlerRan = true; });
  assert.ok(handlerRan);
});

test("a Redis read failure falls back to the handler", async () => {
  const redis = { get: async () => { throw new Error("redis down"); }, setEx: async () => {} };
  let handlerRan = false;
  cachedForAnonymous({ key: () => "k", ttl: 60 })({ redisClient: redis }, fakeRes(), () => { handlerRan = true; });
  await tick();
  assert.ok(handlerRan);
});

test("invalidate deletes the key and keys are namespaced", async () => {
  const redis = fakeRedis({ "cache:group:v1:7": "x" });
  await invalidate(redis, groupKey("7"));
  assert.deepEqual(redis.calls.del, ["cache:group:v1:7"]);
  assert.equal(groupKey("7"), "cache:group:v1:7");
  assert.equal(await invalidate(undefined, "k"), undefined);
});
