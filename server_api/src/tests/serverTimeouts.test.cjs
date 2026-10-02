"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { configureServerTimeouts, ALB_IDLE_TIMEOUT_MS } = require("../utils/serverTimeouts.cjs");

test("keep-alive timeout outlives the load balancer's idle timeout", () => {
  const server = http.createServer();
  configureServerTimeouts(server);
  assert.ok(server.keepAliveTimeout > ALB_IDLE_TIMEOUT_MS, `keepAliveTimeout ${server.keepAliveTimeout} must exceed ${ALB_IDLE_TIMEOUT_MS}`);
  server.close();
});

test("headers timeout outlives the keep-alive timeout", () => {
  const server = http.createServer();
  configureServerTimeouts(server);
  assert.ok(server.headersTimeout > server.keepAliveTimeout, `headersTimeout ${server.headersTimeout} must exceed keepAliveTimeout ${server.keepAliveTimeout}`);
  server.close();
});

test("an explicit idle timeout is honoured", () => {
  const server = http.createServer();
  configureServerTimeouts(server, { albIdleTimeoutMs: 120000 });
  assert.ok(server.keepAliveTimeout > 120000);
  assert.ok(server.headersTimeout > server.keepAliveTimeout);
  server.close();
});

test("returns the server for chaining", () => {
  const server = http.createServer();
  assert.equal(configureServerTimeouts(server), server);
  server.close();
});
