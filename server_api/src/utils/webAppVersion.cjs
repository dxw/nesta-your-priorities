"use strict";

// Remember which web app version a visitor asked for, but only when they
// asked explicitly with ?useNewVersion=true|false. The default comes from
// the domain configuration on every request, so storing it would only turn
// every anonymous visit into a session write, which makes express-session
// issue a cookie, and a cookie on a cacheable response (the landing page is
// cached by CloudFront) is handed to every visitor who receives the cached
// copy.
function rememberVersionChoice(req, useNewVersion) {
  const explicit = req.query && (req.query.useNewVersion === "true" || req.query.useNewVersion === "false");
  if (!explicit || !req.session) {
    return false;
  }
  if (req.session.useNewVersion === useNewVersion) {
    return false;
  }
  req.session.useNewVersion = useNewVersion;
  return true;
}

// The landing page is cached by CloudFront, so a copy of it must never carry
// a session cookie. A request with an explicit version choice is the one
// case that writes the session (and so gets a Set-Cookie); that response
// stays private.
const PUBLIC_LANDING_CACHE = "public, max-age=300, s-maxage=60, stale-while-revalidate=60";

function landingPageCacheControl(req) {
  const explicit = req.query && (req.query.useNewVersion === "true" || req.query.useNewVersion === "false");
  return explicit ? "private, no-store" : PUBLIC_LANDING_CACHE;
}

module.exports = { rememberVersionChoice, landingPageCacheControl };
