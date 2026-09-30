"use strict";

// Mark a response as cacheable by the CDN for anonymous visitors only. The
// app's CloudFront distribution honours origin Cache-Control headers, so a
// public 200 response with s-maxage is served from the edge to every visitor
// without a session for that long. Browsers get max-age=0 and revalidate
// with the ETag on every use, so an admin's edit shows within the edge
// lifetime; there is deliberately no stale-while-revalidate, which would let
// caches (browsers included) serve a stale copy beyond it. Logged-in and
// error responses are marked private and never stored by a shared cache.
//
// The header is set when the handler sends, once the status is known. Only
// use this on routes whose anonymous response is identical for every
// visitor (domain, group, categories). Never on anything under /api/users.
function cacheForAnonymous(edgeSeconds = 60) {
  return function (req, res, next) {
    const send = res.send.bind(res);
    res.send = (body) => {
      const shareable = !req.user && res.statusCode === 200;
      res.setHeader("Cache-Control", shareable ? `public, max-age=0, s-maxage=${edgeSeconds}` : "private, no-store");
      return send(body);
    };
    next();
  };
}

module.exports = { cacheForAnonymous };
