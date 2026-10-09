"use strict";

// Robots are routed to the server-rendered pages in controllers/nonSpa.cjs.
// That must not apply to static files: CloudFront caches images and fonts for
// a day without regard to the User-Agent, so a robot that fetched an image
// first would get the HTML bot page and the CDN would hand that HTML to every
// browser asking for the image.
const FILE_EXTENSION = /\.[a-z0-9]+$/i;
const PAGE_EXTENSION = /\.html?$/i;

function shouldServeBotPage(path) {
  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  return !FILE_EXTENSION.test(lastSegment) || PAGE_EXTENSION.test(lastSegment);
}

// Bot pages differ from what browsers get for the same URL, and the cache key
// does not include the User-Agent, so they must never be stored at the edge.
function markBotPageUncacheable(res) {
  res.setHeader("Cache-Control", "private, no-store");
}

module.exports = { shouldServeBotPage, markBotPageUncacheable };
