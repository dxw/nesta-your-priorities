import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ExcelJS from "exceljs";
import sharp from "sharp";
import ts from "typescript";

const require = createRequire(import.meta.url);
const script = await readFile(
  new URL("../scripts/posts/importPostsForGroupFromXls.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(script, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

async function runImport(
  args: string[], headers: string[], rows: string[][],
  options: { duplicate?: boolean; failImageSave?: boolean; failAssociation?: boolean;
    failUpload?: boolean; failCommit?: boolean; failCleanup?: boolean;
    storageError?: { name: string; $metadata?: { httpStatusCode: number } } } = {}
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ideas");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const posts: any[] = [];
  const createdUsers: any[] = [];
  const errors: string[] = [];
  const messages: string[] = [];
  const storageChecks: string[] = [];
  const memberships: number[] = [];
  const transactionCalls: string[] = [];
  const uploads: any[] = [];
  const removedUploads: any[] = [];
  const images: any[] = [];
  const links: any[] = [];
  const storage = {
    _handleFile: async (_request: any, file: any, callback: Function) => {
      for await (const chunk of file.stream) { assert.ok(chunk.length); }
      if (options.failUpload) return callback(new Error("Upload failed"));
      const uploaded = { originalname: file.originalname, Bucket: "test", Key: "cover.png" };
      uploads.push(uploaded);
      callback(null, uploaded);
    },
    _removeFile: (_request: any, file: any, callback: Function) => {
      removedUploads.push(file);
      callback(options.failCleanup ? new Error("Cleanup failed") : null);
    },
  };
  const defaultAuthor = { id: 42, email: "admin@example.org" };
  const exitSignal = new Error("CLI exit");
  let exitCode: number | undefined;
  const collection = {
    hasGroupUser: async () => false,
    hasCommunityUser: async () => true,
    hasDomainUser: async () => true,
    addGroupUser: async (user: any) => memberships.push(user.id),
    increment: async () => {},
  };
  const models = {
    Group: {
      findOne: async () => ({
        ...collection,
        configuration: {},
        Community: { ...collection, domain_id: 1 },
      }),
    },
    Domain: { findByPk: async () => collection },
    Category: { findAll: async () => [] },
    User: {
      findByPk: async (id: number) => id === 42 ? defaultAuthor : null,
      findOne: async () => null,
      create: async (data: any) => {
        createdUsers.push(data);
        return { ...data, id: 99 };
      },
    },
    Post: {
      CONTENT_IDEA: 1,
      unscoped: () => ({ findOne: async () => options.duplicate ? { id: 12 } : null }),
      create: async (data: any) => {
        posts.push(data);
        return {
          addPostHeaderImage: async (image: any, associationOptions: any) => {
            if (options.failAssociation) throw new Error("Association failed");
            assert.ok(associationOptions.transaction);
            links.push(image);
          },
        };
      },
    },
    Image: {
      getSharpVersions: (itemType: string) => {
        assert.equal(itemType, "post-header");
        return [];
      },
      createFormatsFromSharpFile: () => ["https://example.org/cover.png"],
      create: async (data: any, imageOptions: any) => {
        if (options.failImageSave) throw new Error("Image save failed");
        assert.ok(imageOptions.transaction);
        const image = { ...data, id: 77 };
        images.push(image);
        return image;
      },
    },
    sequelize: {
      transaction: async () => {
        transactionCalls.push("begin");
        return {
          commit: async () => {
            if (options.failCommit) throw new Error("Commit failed");
            transactionCalls.push("commit");
          },
          rollback: async () => transactionCalls.push("rollback"),
        };
      },
    },
  };
  const logger = {
    info: (message: string) => messages.push(message),
    warn: () => {},
    error: (error: unknown) => {
      if (error === exitSignal) throw error;
      errors.push(String(error));
    },
  };
  try {
    await vm.runInNewContext(compiled, {
      exports: {},
      require: (specifier: string) => {
        if (specifier === "exceljs") {
          return { Workbook: class {
            worksheets = [sheet];
            xlsx = { readFile: async () => {} };
          } };
        }
        if (specifier === "../../models/index.cjs") return models;
        if (specifier === "../../utils/loggerTs.js") return logger;
        if (specifier === "../../utils/multerSharpS3Compat.cjs") return () => storage;
        if (specifier === "../../utils/awsS3Client.cjs") {
          return { createS3ClientForBucket: async () => ({
            send: async (command: any) => {
              assert.equal(command.constructor.name, "HeadBucketCommand");
              assert.equal(posts.length, 0);
              assert.deepEqual(transactionCalls, []);
              storageChecks.push(command.input.Bucket);
              if (options.storageError) throw options.storageError;
              return {};
            },
          }) };
        }
        return require(specifier);
      },
      process: {
        env: { S3_BUCKET: "test", S3_REGION: "test" },
        argv: ["node", "importPostsForGroupFromXls.js", ...args],
        exit: (code: number) => {
          exitCode = code;
          if (code !== 0) throw exitSignal;
        },
      },
    });
  } catch (error) {
    if (error !== exitSignal) throw error;
  }
  return { exitCode, posts, createdUsers, errors, memberships, transactionCalls,
    uploads, removedUploads, images, links, messages, storageChecks };
}

test("imports rows without an Email column using the default author", async () => {
  const result = await runImport(
    ["ideas.xlsx", "1", "--default-author-id", "42"],
    ["Post name"], [["Garden"]]
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.posts[0]?.user_id, 42);
  assert.deepEqual(result.createdUsers, []);
  assert.deepEqual(result.memberships, [42]);
  assert.deepEqual(result.transactionCalls, ["begin", "commit"]);
});

test("uses the default for blank emails but preserves supplied email authors", async () => {
  const result = await runImport(
    ["ideas.xlsx", "1", "--default-author-id", "42", "--dry-run"],
    ["Post name", "Email"], [["Garden", ""], ["Park", "AUTHOR@example.org"]]
  );
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.posts.map((post) => post.user_id), [42, 99]);
  assert.equal(result.createdUsers[0]?.email, "author@example.org");
  assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
});

test("still requires Email when no default author is supplied", async () => {
  const result = await runImport(["ideas.xlsx", "1"], ["Post name"], [["Garden"]]);
  assert.equal(result.exitCode, 1);
  assert.match(result.errors.join("\n"), /Missing required column "Email"/);
  assert.equal(result.posts.length, 0);
});

test("rejects an unknown default author before starting a transaction", async () => {
  const result = await runImport(
    ["ideas.xlsx", "1", "--default-author-id", "404"],
    ["Post name", "Email"], [["Garden", "author@example.org"]]
  );
  assert.equal(result.exitCode, 1);
  assert.match(result.errors.join("\n"), /Default author 404 not found/);
  assert.deepEqual(result.transactionCalls, []);
});

test("rejects malformed or missing default author IDs", async () => {
  for (const value of ["0", "-1", "1.5", "invalid", undefined]) {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", ...(value ? [value] : [])],
      ["Post name", "Email"], [["Garden", "author@example.org"]]
    );
    assert.equal(result.exitCode, 1, String(value));
    assert.equal(result.posts.length, 0);
  }
});

test("does not substitute the default author for an invalid nonblank email", async () => {
  const result = await runImport(
    ["ideas.xlsx", "1", "--default-author-id", "42"],
    ["Post name", "Email"], [["Garden", "invalid"]]
  );
  assert.equal(result.exitCode, 1);
  assert.equal(result.posts.length, 0);
  assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
});

async function withImageFolder(run: (folder: string) => Promise<void>) {
  const folder = await mkdtemp(path.join(tmpdir(), "yp-import-images-"));
  try {
    const image = await sharp({ create: {
      width: 2, height: 2, channels: 3, background: "white",
    } }).png().toBuffer();
    await writeFile(path.join(folder, "garden.png"), image);
    await run(folder);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test("uploads and attaches a cover image while allowing blank image filenames", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"], ["Park", ""]]
    );
    assert.equal(result.exitCode, 0, result.errors.join("\n"));
    assert.equal(result.uploads.length, 1);
    assert.equal(result.images[0]?.user_id, 42);
    assert.equal(result.images[0]?.original_filename, "garden.png");
    assert.equal(result.links[0]?.id, 77);
    assert.equal(result.posts[0]?.cover_media_type, "image");
    assert.notEqual(result.posts[1]?.cover_media_type, "image");
    assert.deepEqual(result.removedUploads, []);
    assert.deepEqual(result.storageChecks, ["test"]);
    assert.match(result.messages.join("\n"), /Images: 1 referenced, 1 uploaded, 1 attached, 0 skipped/);
  });
});

test("dry runs validate images without uploading or creating image records", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder, "--dry-run"],
      ["Post name", "Image filename"], [["Garden", "garden.png"]]
    );
    assert.equal(result.exitCode, 0, result.errors.join("\n"));
    assert.deepEqual(result.uploads, []);
    assert.deepEqual(result.images, []);
    assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
    assert.deepEqual(result.storageChecks, []);
    assert.match(result.messages.join("\n"), /Images: 1 referenced, 0 uploaded, 0 attached, 0 skipped; 1 would be uploaded/);
  });
});

test("validates all referenced images before opening a transaction", async () => {
  await withImageFolder(async (folder) => {
    for (const dryRun of [false, true]) {
      const result = await runImport(
        ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder,
          ...(dryRun ? ["--dry-run"] : [])],
        ["Post name", "Image filename"], [["Garden", "garden.png"], ["Park", "missing.png"]]
      );
      assert.equal(result.exitCode, 1);
      assert.match(result.errors.join("\n"), /Row 3.*missing.png/);
      assert.deepEqual(result.transactionCalls, []);
      assert.deepEqual(result.uploads, []);
    }
  });
});

test("requires an image folder for nonblank image filenames", async () => {
  const result = await runImport(
    ["ideas.xlsx", "1", "--default-author-id", "42"],
    ["Post name", "Image filename"], [["Garden", "garden.png"]]
  );
  assert.equal(result.exitCode, 1);
  assert.match(result.errors.join("\n"), /--images-dir/);
  assert.deepEqual(result.transactionCalls, []);
});

test("rejects paths and corrupt image content before opening a transaction", async () => {
  await withImageFolder(async (folder) => {
    await writeFile(path.join(folder, "corrupt.png"), "not an image");
    for (const filename of ["../garden.png", "/garden.png", "sub/garden.png", "corrupt.png"]) {
      const result = await runImport(
        ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
        ["Post name", "Image filename"], [["Garden", filename]]
      );
      assert.equal(result.exitCode, 1, filename);
      assert.match(result.errors.join("\n"), /Row 2/);
      assert.deepEqual(result.transactionCalls, []);
    }
  });
});

test("rejects symlinks pointing outside the image folder", async () => {
  await withImageFolder(async (folder) => {
    await withImageFolder(async (outsideFolder) => {
      await symlink(path.join(outsideFolder, "garden.png"), path.join(folder, "outside.png"));
      const result = await runImport(
        ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
        ["Post name", "Image filename"], [["Garden", "outside.png"]]
      );
      assert.equal(result.exitCode, 1);
      assert.match(result.errors.join("\n"), /Image must be inside --images-dir/);
      assert.deepEqual(result.transactionCalls, []);
    });
  });
});

test("rolls back without creating image records when an upload fails", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"]], { failUpload: true }
    );
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join("\n"), /Upload failed/);
    assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
    assert.deepEqual(result.images, []);
  });
});

test("cleans up earlier uploads when a later spreadsheet row fails", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"], ["", "garden.png"]]
    );
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join("\n"), /Row 3/);
    assert.equal(result.uploads.length, 1);
    assert.deepEqual(result.removedUploads, result.uploads);
    assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
  });
});

test("duplicate ideas are not uploaded again", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"]], { duplicate: true }
    );
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.uploads, []);
    assert.deepEqual(result.images, []);
    assert.match(result.messages.join("\n"), /Images: 1 referenced, 0 uploaded, 0 attached, 1 skipped/);
  });
});

test("rejects --images-dir without the exact Image filename column, including on dry runs", async () => {
  await withImageFolder(async (folder) => {
    for (const header of ["Images", "Image Filename"]) {
      for (const dryRun of [false, true]) {
        const result = await runImport(
          ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder,
            ...(dryRun ? ["--dry-run"] : [])],
          ["Post name", header], [["Garden", "garden.png"]]
        );
        assert.equal(result.exitCode, 1);
        assert.match(result.errors.join("\n"), /--images-dir requires an "Image filename" column/);
        assert.deepEqual(result.transactionCalls, []);
        assert.deepEqual(result.storageChecks, []);
        assert.deepEqual(result.uploads, []);
      }
    }
  });
});

test("reports zero images without checking storage when image filenames are blank", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", ""]]
    );
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.storageChecks, []);
    assert.match(result.messages.join("\n"), /Images: 0 referenced, 0 uploaded, 0 attached, 0 skipped/);
  });
});

test("counts repeated image filenames per idea rather than per unique file", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"], ["Park", "garden.png"]]
    );
    assert.equal(result.exitCode, 0);
    assert.match(result.messages.join("\n"), /Images: 2 referenced, 2 uploaded, 2 attached, 0 skipped/);
  });
});

test("dry runs exclude duplicate-post images from would-upload totals", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder, "--dry-run"],
      ["Post name", "Image filename"], [["Garden", "garden.png"]], { duplicate: true }
    );
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.storageChecks, []);
    assert.match(result.messages.join("\n"), /Images: 1 referenced, 0 uploaded, 0 attached, 1 skipped; 0 would be uploaded/);
  });
});

test("reports storage authentication, bucket, and endpoint failures before any database writes", async () => {
  await withImageFolder(async (folder) => {
    for (const [storageError, expected] of [
      [{ name: "InvalidAccessKeyId" }, /credentials/],
      [{ name: "SignatureDoesNotMatch" }, /credentials/],
      [{ name: "AccessDenied", $metadata: { httpStatusCode: 403 } }, /permissions/],
      [{ name: "NotFound", $metadata: { httpStatusCode: 404 } }, /bucket.*exist/],
      [{ name: "ECONNREFUSED" }, /S3_ENDPOINT/],
    ] as const) {
      const result = await runImport(
        ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
        ["Post name", "Image filename"], [["Garden", "garden.png"]], { storageError }
      );
      assert.equal(result.exitCode, 1);
      assert.match(result.errors.join("\n"), /Storage preflight failed/);
      assert.match(result.errors.join("\n"), expected);
      assert.deepEqual(result.transactionCalls, []);
      assert.deepEqual(result.createdUsers, []);
      assert.deepEqual(result.posts, []);
      assert.deepEqual(result.uploads, []);
    }
  });
});

test("rolls back and removes uploaded objects when saving or linking images or committing fails", async () => {
  await withImageFolder(async (folder) => {
    for (const options of [{ failImageSave: true }, { failAssociation: true }, { failCommit: true }]) {
      const result = await runImport(
        ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
        ["Post name", "Image filename"], [["Garden", "garden.png"]], options
      );
      assert.equal(result.exitCode, 1);
      assert.deepEqual(result.transactionCalls, ["begin", "rollback"]);
      assert.equal(result.uploads.length, 1);
      assert.deepEqual(result.removedUploads, result.uploads);
    }
  });
});

test("reports cleanup errors without hiding the original import failure", async () => {
  await withImageFolder(async (folder) => {
    const result = await runImport(
      ["ideas.xlsx", "1", "--default-author-id", "42", "--images-dir", folder],
      ["Post name", "Image filename"], [["Garden", "garden.png"]],
      { failImageSave: true, failCleanup: true }
    );
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join("\n"), /Image save failed/);
    assert.match(result.errors.join("\n"), /Cleanup failed/);
  });
});