"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { cacheForAnonymous } = require("../utils/publicCache.cjs");

// The header is decided when the handler sends, so that error responses are
// never marked public.
function run(req, statusCode = 200, edgeSeconds = 60) {
  const headers = {};
  const res = { statusCode, setHeader: (k, v) => { headers[k] = v; }, send: (b) => b };
  let nextCalled = false;
  cacheForAnonymous(edgeSeconds)(req, res, () => { nextCalled = true; });
  res.send({ ok: true });
  return { headers, nextCalled };
}

test("anonymous 200 responses are shared-cacheable at the edge and always revalidated by browsers", () => {
  const { headers, nextCalled } = run({});
  assert.equal(headers["Cache-Control"], "public, max-age=0, s-maxage=60");
  assert.ok(nextCalled);
});

test("no stale-while-revalidate: a stale copy is never served past the edge lifetime", () => {
  const { headers } = run({});
  assert.doesNotMatch(headers["Cache-Control"], /stale-while-revalidate/);
});

test("logged-in responses are never stored by a shared cache", () => {
  const { headers } = run({ user: { id: 7 } });
  assert.equal(headers["Cache-Control"], "private, no-store");
});

test("error responses are never stored by a shared cache", () => {
  for (const status of [401, 404, 500]) {
    const { headers } = run({}, status);
    assert.equal(headers["Cache-Control"], "private, no-store", `status ${status}`);
  }
});

test("the edge lifetime is configurable", () => {
  const { headers } = run({}, 200, 300);
  assert.equal(headers["Cache-Control"], "public, max-age=0, s-maxage=300");
});
