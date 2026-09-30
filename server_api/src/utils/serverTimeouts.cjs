"use strict";

// Dalmatian's Application Load Balancer keeps idle connections to the app
// open for 60 s. Node's default keepAliveTimeout is 5 s, so the app closes
// an idle keep-alive connection first; when the ALB then reuses that
// connection for a new request it gets a reset and answers the visitor with
// a 502. Keeping the app's timeout above the ALB's removes the race, and
// headersTimeout must stay above keepAliveTimeout or Node emits a warning
// and the keep-alive value is not honoured.
const ALB_IDLE_TIMEOUT_MS = 60 * 1000;
const KEEP_ALIVE_MARGIN_MS = 5 * 1000;
const HEADERS_MARGIN_MS = 1 * 1000;

function configureServerTimeouts(server, { albIdleTimeoutMs = ALB_IDLE_TIMEOUT_MS } = {}) {
  server.keepAliveTimeout = albIdleTimeoutMs + KEEP_ALIVE_MARGIN_MS;
  server.headersTimeout = server.keepAliveTimeout + HEADERS_MARGIN_MS;
  return server;
}

module.exports = { configureServerTimeouts, ALB_IDLE_TIMEOUT_MS };
