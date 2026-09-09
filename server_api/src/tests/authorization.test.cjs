"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Module = require("node:module");

const authorizationPath = path.resolve(__dirname, "../authorization.cjs");

const loadAuthorization = ({ domain, community } = {}) => {
  const source = fs.readFileSync(authorizationPath, "utf8");
  const module = { exports: {} };
  const baseRequire = Module.createRequire(authorizationPath);

  const mockedRequire = (request) => {
    switch (request) {
      case "./models/index.cjs":
        return {
          Domain: {
            async findOne() {
              return domain;
            },
          },
          Community: {
            async findOne() {
              return community;
            },
          },
        };
      case "./utils/logger.cjs":
        return {
          info() {},
          error() {},
          warn() {},
          debug() {},
        };
      default:
        return baseRequire(request);
    }
  };

  const wrapped = Module.wrap(source);
  const compiled = vm.runInThisContext(wrapped, {
    filename: authorizationPath,
  });

  compiled(
    module.exports,
    mockedRequire,
    module,
    authorizationPath,
    path.dirname(authorizationPath)
  );

  return module.exports;
};

const callHasAdmin = (fn, id, req) =>
  new Promise((resolve) => {
    fn(id, req, (error, isAdmin) => resolve(isAdmin));
  });

const authenticatedReq = (userId) => ({
  user: { id: userId },
  isAuthenticated() {
    return true;
  },
});

const anonymousReq = () => ({
  user: undefined,
  isAuthenticated() {
    return false;
  },
});

// auth.hasDomainAdmin

test("hasDomainAdmin: denies an anonymous (not logged in) request", async () => {
  const auth = loadAuthorization({
    domain: {
      id: 1,
      user_id: 99,
      async hasDomainAdmins() {
        return true;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasDomainAdmin, 1, anonymousReq());

  assert.equal(isAdmin, false);
});

test("hasDomainAdmin: allows the domain's owner (user_id match) even without an explicit admin grant", async () => {
  const auth = loadAuthorization({
    domain: {
      id: 1,
      user_id: 42,
      async hasDomainAdmins() {
        return false;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasDomainAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, true);
});

test("hasDomainAdmin: allows a logged-in user granted domain admin rights", async () => {
  const auth = loadAuthorization({
    domain: {
      id: 1,
      user_id: 99,
      async hasDomainAdmins() {
        return true;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasDomainAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, true);
});

test("hasDomainAdmin: denies a logged-in user with no admin rights on the domain", async () => {
  const auth = loadAuthorization({
    domain: {
      id: 1,
      user_id: 99,
      async hasDomainAdmins() {
        return false;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasDomainAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, false);
});

test("hasDomainAdmin: denies (rather than throws) when the lookup fails", async () => {
  const auth = loadAuthorization({ domain: undefined });

  const isAdmin = await callHasAdmin(auth.hasDomainAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, false);
});

// auth.hasCommunityAdmin

test("hasCommunityAdmin: denies an anonymous (not logged in) request", async () => {
  const auth = loadAuthorization({
    community: {
      id: 1,
      user_id: 99,
      async hasCommunityAdmins() {
        return true;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasCommunityAdmin, 1, anonymousReq());

  assert.equal(isAdmin, false);
});

test("hasCommunityAdmin: allows the community's owner (user_id match) even without an explicit admin grant", async () => {
  const auth = loadAuthorization({
    community: {
      id: 1,
      user_id: 42,
      async hasCommunityAdmins() {
        return false;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasCommunityAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, true);
});

test("hasCommunityAdmin: allows a logged-in user granted community admin rights", async () => {
  const auth = loadAuthorization({
    community: {
      id: 1,
      user_id: 99,
      async hasCommunityAdmins() {
        return true;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasCommunityAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, true);
});

test("hasCommunityAdmin: denies a logged-in user with no admin rights on the community", async () => {
  const auth = loadAuthorization({
    community: {
      id: 1,
      user_id: 99,
      async hasCommunityAdmins() {
        return false;
      },
    },
  });

  const isAdmin = await callHasAdmin(auth.hasCommunityAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, false);
});

test("hasCommunityAdmin: denies (rather than throws) when the lookup fails", async () => {
  const auth = loadAuthorization({ community: undefined });

  const isAdmin = await callHasAdmin(auth.hasCommunityAdmin, 1, authenticatedReq(42));

  assert.equal(isAdmin, false);
});
