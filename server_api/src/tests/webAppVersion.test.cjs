"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { rememberVersionChoice } = require("../utils/webAppVersion.cjs");

test("a plain request leaves the session untouched, so no cookie is issued", () => {
  const session = {};
  rememberVersionChoice({ query: {}, session }, true);
  assert.deepEqual(session, {});
});

test("an explicit ?useNewVersion=true is remembered in the session", () => {
  const session = {};
  rememberVersionChoice({ query: { useNewVersion: "true" }, session }, true);
  assert.equal(session.useNewVersion, true);
});

test("an explicit ?useNewVersion=false is remembered in the session", () => {
  const session = {};
  rememberVersionChoice({ query: { useNewVersion: "false" }, session }, false);
  assert.equal(session.useNewVersion, false);
});

test("a repeated explicit choice does not rewrite an identical value", () => {
  const session = { useNewVersion: true };
  let writes = 0;
  const tracked = new Proxy(session, { set(t, k, v) { writes += 1; t[k] = v; return true; } });
  rememberVersionChoice({ query: { useNewVersion: "true" }, session: tracked }, true);
  assert.equal(writes, 0);
});

test("a request without a session is tolerated", () => {
  assert.doesNotThrow(() => rememberVersionChoice({ query: { useNewVersion: "true" } }, true));
});

const { landingPageCacheControl } = require("../utils/webAppVersion.cjs");

test("the landing page is publicly cacheable by default", () => {
  assert.equal(landingPageCacheControl({ query: {} }), "public, max-age=300, s-maxage=60, stale-while-revalidate=60");
});

test("a landing page that records an explicit version choice is never publicly cached", () => {
  assert.equal(landingPageCacheControl({ query: { useNewVersion: "true" } }), "private, no-store");
  assert.equal(landingPageCacheControl({ query: { useNewVersion: "false" } }), "private, no-store");
});
