"use strict";

// Cache a route's JSON response in Redis for anonymous visitors.
//
// The group object is the same for every visitor without a session and is
// most of the database work of a group page view. (The domain is resolved
// by app-wide middleware before any route runs, so caching the /api/domains
// response would save nothing at the origin; the CDN cache covers it.) On a miss the
// handler runs as normal and its 200 response body is stored for `ttl`
// seconds; on a hit the stored body is sent and the handler does not run.
// Logged-in requests, requests without a Redis client, and any Redis error
// fall through to the handler. Admin edits call invalidate(); the TTL
// bounds staleness for everything else (for example a post's status
// changing what hasNonOpenPosts reports). Invalidation runs after the
// edit is persisted so a concurrent miss cannot re-cache the old value.
function cachedForAnonymous({ key, ttl = 60 }) {
  return function (req, res, next) {
    if (req.user || !req.redisClient) {
      return next();
    }
    const cacheKey = key(req);
    req.redisClient
      .get(cacheKey)
      .then((cached) => {
        if (cached) {
          res.setHeader("X-App-Cache", "hit");
          res.send(JSON.parse(cached));
          return;
        }
        const send = res.send.bind(res);
        res.send = (body) => {
          if (res.statusCode === 200 && body && typeof body === "object") {
            req.redisClient.setEx(cacheKey, ttl, JSON.stringify(body)).catch(() => {});
          }
          return send(body);
        };
        next();
      })
      .catch(() => next());
  };
}

function invalidate(redisClient, cacheKey) {
  if (!redisClient) {
    return Promise.resolve();
  }
  return redisClient.del(cacheKey).catch(() => {});
}

const groupKey = (groupId) => `cache:group:v1:${groupId}`;

module.exports = { cachedForAnonymous, invalidate, groupKey };
