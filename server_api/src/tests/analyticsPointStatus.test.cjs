"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const { Op } = require("sequelize");

const source = fs.readFileSync(
  require.resolve("../services/engine/analytics/manager.cjs"), "utf8"
);

for (const status of ["published", "blocked", "admin_only"]) {
  test(`point analytics ${status === "admin_only" ? "excludes" : "synchronizes"} ${status} records`, async () => {
    const point = { id: 12, status };
    const imported = [];
    let query;
    const association = { unscoped() { return this; } };
    const models = {
      Point: {
        unscoped: () => ({
          findOne: async (options) => {
            query = options;
            const filter = options.where.status;
            return (typeof filter === "string"
              ? status === filter
              : status !== filter[Op.ne]) ? point : null;
          },
        }),
      },
      Post: association,
      Group: association,
      Community: association,
      Domain: {},
      PointRevision: {},
      Video: {},
      Audio: {},
    };
    const module = { exports: {} };
    vm.runInNewContext(source, {
      module,
      process: { env: {
        AC_ANALYTICS_KEY: "test",
        AC_ANALYTICS_CLUSTER_ID: "test",
        AC_ANALYTICS_BASE_URL: "test",
      } },
      require: (specifier) => {
        if (specifier === "../../../models/index.cjs") return models;
        if (specifier === "../../../utils/logger.cjs") return { info() {} };
        if (specifier === "./utils.cjs") return {
          importPoint: (record, done) => { imported.push(record); done(); },
        };
        if (specifier === "../../../utils/requestCompat.cjs") return {};
        if (specifier === "../../../utils/privatePointComments.cjs") {
          return require("../utils/privatePointComments.cjs");
        }
        return require(specifier);
      },
    });

    await new Promise((resolve) => {
      module.exports.updateCollection({ pointId: 12 }, () => resolve());
    });

    assert.equal(query.where.id, 12);
    assert.deepEqual(imported, status === "admin_only" ? [] : [point]);
    assert.equal(query.where.status[Op.ne], "admin_only");
  });
}