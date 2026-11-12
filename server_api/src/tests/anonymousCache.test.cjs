"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { cacheForAnonymous } = require("../utils/anonymousCache.cjs");

// Runs one request through the middleware on a real http server, so the
// header is decided exactly where Node decides it: when the head is written.
async function headersFor({ before, handler, method = "GET" }) {
  const middleware = cacheForAnonymous(300);
  const server = http.createServer((req, res) => {
    if (before) before(req, res);
    middleware(req, res, () => handler(req, res));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/`, { method });
    await response.arrayBuffer();
    return response.headers;
  } finally {
    server.close();
  }
}

const ok = (req, res) => {
  res.statusCode = 200;
  res.end("{}");
};

test("an anonymous 200 is cacheable at the edge", async () => {
  const headers = await headersFor({ handler: ok });
  assert.equal(headers.get("cache-control"), "public, max-age=0, s-maxage=300");
});

test("HEAD is treated like GET", async () => {
  const headers = await headersFor({ handler: ok, method: "HEAD" });
  assert.equal(headers.get("cache-control"), "public, max-age=0, s-maxage=300");
});

test("a signed-in visitor, guest accounts included, is never cached", async () => {
  const headers = await headersFor({
    before: (req) => { req.user = { id: 1 }; },
    handler: ok,
  });
  assert.equal(headers.get("cache-control"), "private, no-store");
});

test("a user attached after the middleware ran still counts", async () => {
  const headers = await headersFor({
    handler: (req, res) => { req.user = { id: 1 }; ok(req, res); },
  });
  assert.equal(headers.get("cache-control"), "private, no-store");
});

test("errors are not cached", async () => {
  for (const status of [401, 404, 500]) {
    const headers = await headersFor({
      handler: (req, res) => { res.statusCode = status; res.end(); },
    });
    assert.equal(headers.get("cache-control"), "private, no-store", `status ${status}`);
  }
});

test("a 304 revalidating a cached copy keeps it public", async () => {
  const headers = await headersFor({
    handler: (req, res) => { res.statusCode = 304; res.end(); },
  });
  assert.equal(headers.get("cache-control"), "public, max-age=0, s-maxage=300");
});

test("a status passed straight to writeHead is honoured", async () => {
  const headers = await headersFor({
    handler: (req, res) => { res.writeHead(404); res.end(); },
  });
  assert.equal(headers.get("cache-control"), "private, no-store");
});

test("a response that already carries a cookie is not cached", async () => {
  const headers = await headersFor({
    handler: (req, res) => { res.setHeader("Set-Cookie", "sid=abc"); ok(req, res); },
  });
  assert.equal(headers.get("cache-control"), "private, no-store");
});

// express-session adds its cookie from an on-headers hook: a writeHead wrapper
// installed before this middleware, so it runs after ours has chosen.
function addCookieWhenHeadersAreWritten(res) {
  const writeHead = res.writeHead;
  res.writeHead = function (...args) {
    res.setHeader("Set-Cookie", "sid=abc");
    return writeHead.apply(this, args);
  };
}

test("a cookie added by an earlier on-headers hook still makes it private", async () => {
  const headers = await headersFor({
    before: (req, res) => addCookieWhenHeadersAreWritten(res),
    handler: ok,
  });
  assert.equal(headers.get("cache-control"), "private, no-store");
  assert.equal(headers.get("set-cookie"), "sid=abc");
});

test("non-GET methods are not cached", async () => {
  const headers = await headersFor({ handler: ok, method: "POST" });
  assert.equal(headers.get("cache-control"), "private, no-store");
});
