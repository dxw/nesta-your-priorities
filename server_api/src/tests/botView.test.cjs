"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const pug = require("pug");

const render = pug.compileFile(path.join(__dirname, "../views/bot.pug"));

const DEFAULT_DESCRIPTION =
  "Martin Lewis wants your ideas for practical, small, non-controversial ways to improve the UK.";
const DEFAULT_IMAGE = "https://small-ideas.org/images/home/og-image.png";

function baseOptions(overrides) {
  return {
    url: "https://example.invalid/",
    title: "Small Ideas Initiative",
    descriptionText: "",
    imageUrl: "",
    subItemsUrlbase: "/community/",
    subItemContainerName: "Communities",
    subItemIds: [],
    subItemPoints: [],
    backUrl: "/domain/1",
    backText: "Back to domain",
    ...overrides,
  };
}

function meta(html, attr, name) {
  const match = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
  return match ? match[1] : null;
}

test("falls back to the site description and share image when the page has none", () => {
  const html = render(baseOptions({}));
  assert.equal(meta(html, "property", "og:description"), DEFAULT_DESCRIPTION);
  assert.equal(meta(html, "name", "twitter:description"), DEFAULT_DESCRIPTION);
  assert.equal(meta(html, "name", "description"), DEFAULT_DESCRIPTION);
  assert.equal(meta(html, "property", "og:image"), DEFAULT_IMAGE);
  assert.equal(meta(html, "name", "twitter:image"), DEFAULT_IMAGE);
  assert.equal(meta(html, "property", "og:image:width"), "1200");
  assert.equal(meta(html, "property", "og:image:height"), "630");
});

test("puts the description in the body before the platform footer", () => {
  const html = render(baseOptions({}));
  const description = html.indexOf(DEFAULT_DESCRIPTION, html.indexOf("<body>"));
  const footer = html.indexOf("This content is created by the open source");
  assert.ok(description > -1 && description < footer);
});

test("keeps a page's own description and image", () => {
  const html = render(
    baseOptions({ descriptionText: "An idea about parking", imageUrl: "https://example.invalid/idea.png" })
  );
  assert.equal(meta(html, "property", "og:description"), "An idea about parking");
  assert.equal(meta(html, "name", "twitter:description"), "An idea about parking");
  assert.equal(meta(html, "property", "og:image"), "https://example.invalid/idea.png");
  assert.equal(meta(html, "name", "twitter:image"), "https://example.invalid/idea.png");
});
