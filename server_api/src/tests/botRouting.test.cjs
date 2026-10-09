"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { shouldServeBotPage, markBotPageUncacheable } = require("../utils/botRouting.cjs");

test("sends robots to the bot page for page URLs", () => {
  for (const path of ["/", "/group/1", "/group/1/new_post", "/post/42", "/domain/1", "/index.html", "/user/7"]) {
    assert.equal(shouldServeBotPage(path), true, path);
  }
});

test("lets robots fetch static files like browsers do", () => {
  for (const path of [
    "/images/home/og-image.png",
    "/images/home/logo_crop.svg",
    "/images/home/martin_crop.jpg",
    "/images/manifest_yp/icon-512x512.png",
    "/favicon.ico",
    "/robots.txt",
    "/manifest.json",
    "/sw.js",
    "/CRNB1gjk.js",
    "/locales-71fb154d/en/translation.json",
    "/fonts/Poppins.woff2",
    "/IMAGE.PNG",
  ]) {
    assert.equal(shouldServeBotPage(path), false, path);
  }
});

test("treats a dot outside the last path segment as a page URL", () => {
  assert.equal(shouldServeBotPage("/community/v1.2/about"), true);
});

test("marks bot pages so the CDN never stores them", () => {
  const headers = {};
  markBotPageUncacheable({ setHeader: (name, value) => { headers[name] = value; } });
  assert.equal(headers["Cache-Control"], "private, no-store");
});
