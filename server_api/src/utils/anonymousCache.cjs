"use strict";

// Lets CloudFront hold a read-only API response for anonymous visitors.
// The edge cache key includes every cookie, so a cached copy only ever reaches
// requests with the same cookies; this adds the rules that keep personal or
// failed responses out of it altogether.
//
// The decision is made when the head is written, once the status and the
// user are known. express-session adds its cookie from a writeHead hook that
// runs after ours, so any Set-Cookie set later still downgrades the response.
const PRIVATE = "private, no-store";

function isCacheable(req, res, status) {
  return (
    (req.method === "GET" || req.method === "HEAD") &&
    // A 304 answers a revalidation of a cached 200 (from CloudFront or the
    // browser) and must not turn the stored copy private.
    (status === 200 || status === 304) &&
    !req.user &&
    !res.getHeader("Set-Cookie")
  );
}

function cacheForAnonymous(seconds) {
  // Browsers key their cache on the URL alone, so a copy fetched before a
  // visitor signs in would be reused afterwards; only the edge, which keys on
  // cookies too, holds it.
  const publicValue = `public, max-age=0, s-maxage=${seconds}`;

  return function cacheForAnonymousMiddleware(req, res, next) {
    const setHeader = res.setHeader;
    res.setHeader = function (name, value) {
      if (String(name).toLowerCase() === "set-cookie") {
        setHeader.call(this, "Cache-Control", PRIVATE);
      }
      return setHeader.call(this, name, value);
    };

    const writeHead = res.writeHead;
    res.writeHead = function (statusCode, ...rest) {
      const status = typeof statusCode === "number" ? statusCode : res.statusCode;
      setHeader.call(this, "Cache-Control", isCacheable(req, res, status) ? publicValue : PRIVATE);
      return writeHead.call(this, statusCode, ...rest);
    };

    next();
  };
}

module.exports = { cacheForAnonymous };
