"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const controllerPath = require.resolve("../controllers/categories.cjs");
const expressPath = require.resolve("express");
const authPath = require.resolve("../authorization.cjs");
const loggerPath = require.resolve("../utils/logger.cjs");
const toJsonPath = require.resolve("../utils/to_json.cjs");

function injectMock(modulePath, exports) {
  const mock = new Module(modulePath);
  mock.filename = modulePath;
  mock.loaded = true;
  mock.exports = exports;
  require.cache[modulePath] = mock;
}

function loadHandlers(models) {
  const routes = {};
  const router = {
    get(path, ...handlers) {
      routes[`get ${path}`] = handlers.at(-1);
    },
    post(path, ...handlers) {
      routes[`post ${path}`] = handlers.at(-1);
    },
    put(path, ...handlers) {
      routes[`put ${path}`] = handlers.at(-1);
    },
    delete(path, ...handlers) {
      routes[`delete ${path}`] = handlers.at(-1);
    },
  };
  const mockPaths = [
    controllerPath,
    expressPath,
    authPath,
    loggerPath,
    toJsonPath,
  ];
  const originalModules = new Map(
    mockPaths.map((modulePath) => [modulePath, require.cache[modulePath]])
  );
  const originalLoad = Module._load;

  injectMock(expressPath, { Router: () => router });
  injectMock(authPath, { can: () => (_req, _res, next) => next() });
  injectMock(loggerPath, { error() {}, info() {}, warn() {} });
  injectMock(toJsonPath, (value) => value);
  Module._load = function (request, parent, isMain) {
    if (request === "../models/index.cjs" && parent?.filename === controllerPath) {
      return models;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[controllerPath];

  try {
    require(controllerPath);
    return routes;
  } finally {
    Module._load = originalLoad;
    for (const [modulePath, originalModule] of originalModules) {
      if (originalModule) {
        require.cache[modulePath] = originalModule;
      } else {
        delete require.cache[modulePath];
      }
    }
  }
}

function invoke(handler, req) {
  return new Promise((resolve) => {
    handler(req, {
      send: resolve,
      sendStatus: (status) => resolve({ status }),
    });
  });
}

function makeCategory(description = "Existing description") {
  return {
    id: 12,
    name: "Parks",
    description,
    save: async () => {},
    setupImages: (_body, done) => done(),
  };
}

test("category creation defaults missing description to empty text", async () => {
  let createdAttributes;
  const category = makeCategory("");
  const models = {
    Category: {
      build: (attributes) => {
        createdAttributes = attributes;
        Object.assign(category, attributes);
        return category;
      },
    },
    Group: {
      findOne: async () => ({ Community: { domain_id: 4 } }),
    },
    AcActivity: {
      createActivity: (_activity, done) => done(),
    },
  };
  const routes = loadHandlers(models);
  const result = await invoke(routes["post /:groupId"], {
    params: { groupId: 3 },
    body: { name: "Parks" },
    user: { id: 9 },
    ypDomain: { id: 4 },
  });

  assert.equal(createdAttributes.description, "");
  assert.equal(result, category);
});

test("category updates preserve description when the form omits it", async () => {
  const category = makeCategory();
  const models = {
    Category: {
      findOne: async () => category,
    },
  };
  const routes = loadHandlers(models);
  const result = await invoke(routes["put /:id"], {
    params: { id: 12 },
    body: { name: "Updated Parks" },
    user: { id: 9 },
  });

  assert.equal(category.description, "Existing description");
  assert.equal(result, category);
});
