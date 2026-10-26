import ExcelJS from "exceljs";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import models from "../../models/index.cjs";
import { createS3ClientForBucket } from "../../utils/awsS3Client.cjs";
import s3Storage from "../../utils/multerSharpS3Compat.cjs";
import log from "../../utils/loggerTs.js";

const usage =
  "Usage: node importPostsForGroupFromXls.js <xlsFilePath> <groupId> --default-author-id <userId> --images-dir <directory> [--dry-run]";

type ImportImage = {
  filePath: string;
  filename: string;
  mimetype: string;
  outputFormat: string;
};

const validateImage = async (
  filename: string,
  directory: string | undefined,
  rowNumber: number
): Promise<ImportImage> => {
  try {
    if (!directory) throw new Error("--images-dir is required for Image filename");
    if (filename === "." || filename === ".." || /[/\\]/.test(filename)) {
      throw new Error("Image filename must be a plain filename, not a path");
    }
    const filePath = await realpath(path.join(directory, filename));
    if (path.dirname(filePath) !== directory) {
      throw new Error("Image must be inside --images-dir");
    }
    const fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size > 50 * 1024 * 1024) {
      throw new Error("Image must be a regular file no larger than 50 MB");
    }
    const image = sharp(filePath, { animated: true, limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "gif", "webp", "tiff"].includes(metadata.format)) {
      throw new Error("Supported image formats: JPEG, PNG, GIF, WebP, TIFF");
    }
    await image.stats();
    return {
      filePath,
      filename,
      mimetype: `image/${metadata.format}`,
      outputFormat: metadata.format === "gif" ? "gif" : "png",
    };
  } catch (error) {
    throw new Error(`Row ${rowNumber}: invalid image "${filename}": ${error}`);
  }
};

(async () => {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        "dry-run": { type: "boolean", default: false },
        "default-author-id": { type: "string" },
        "images-dir": { type: "string" },
      },
    });
    const dryRun = values["dry-run"];
    const [filePath, groupIdArg] = positionals;
    const groupId = Number(groupIdArg);

    if (positionals.length !== 2 || !filePath || !Number.isInteger(groupId) || groupId <= 0) {
      log.info(usage);
      process.exit(1);
    }

    if (values["default-author-id"] === undefined) {
      throw new Error("--default-author-id is required");
    }
    const defaultAuthorId = Number(values["default-author-id"]);
    if (!Number.isSafeInteger(defaultAuthorId) || defaultAuthorId <= 0) {
      throw new Error("--default-author-id must be a positive integer");
    }
    const defaultAuthor = await models.User.findByPk(defaultAuthorId);
    if (!defaultAuthor) {
      throw new Error(`Default author ${defaultAuthorId} not found`);
    }
    // Generated model types lack association helpers (addGroupUser etc.)
    const group: any = await models.Group.findOne({
      where: { id: groupId },
      include: [{ model: models.Community, attributes: ["id", "domain_id"] }],
    });
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    const community: any = group.Community;
    const domain: any = await models.Domain.findByPk(community.domain_id);
    if (!domain) {
      throw new Error(`Domain ${community.domain_id} not found`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("No worksheet found in file");
    }

    const columns = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      columns.set(cell.text.trim(), colNumber);
    });

    for (const required of ["Post name", "Description", "Category", "Image filename"]) {
      if (!columns.has(required)) {
        throw new Error(`Missing required column "${required}"`);
      }
    }

    const categories = await (models.Category as any).findAll({
      where: { group_id: groupId },
      attributes: ["id", "name"],
    });
    const categoryIdByName = new Map<string, number>(
      categories.map((category: any) => [
        category.name.trim().toLowerCase(),
        category.id,
      ])
    );

    const cellText = (row: ExcelJS.Row, header: string) => {
      const col = columns.get(header);
      return col ? row.getCell(col).text.trim() : "";
    };

    if (values["images-dir"] === undefined) {
      throw new Error("--images-dir is required");
    }
    const imagesDirectory = await realpath(values["images-dir"]);
    if (!(await stat(imagesDirectory)).isDirectory()) {
      throw new Error("--images-dir must be a directory");
    }
    const imageFiles = new Map<number, ImportImage>();
    const validatedImages = new Map<string, ImportImage>();
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const filename = cellText(sheet.getRow(rowNumber), "Image filename");
      if (!filename) {
        throw new Error(`Row ${rowNumber}: missing Image filename`);
      }
      let image = validatedImages.get(filename);
      if (!image) {
        image = await validateImage(filename, imagesDirectory, rowNumber);
        validatedImages.set(filename, image);
      }
      imageFiles.set(rowNumber, image);
    }

    let storage: ReturnType<typeof s3Storage> | undefined;
    if (!dryRun && imageFiles.size > 0) {
      if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET is required to upload images");
      const s3 = await createS3ClientForBucket(process.env.S3_BUCKET, {
        endpoint: process.env.S3_ENDPOINT || null,
        forcePathStyle: process.env.MINIO_ROOT_USER ? true : undefined,
        region: process.env.S3_REGION,
      });
      try {
        await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
      } catch (error) {
        const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
        const code = storageError?.name || "UnknownError";
        const statusCode = storageError?.$metadata?.httpStatusCode;
        let reason: string;
        if (["InvalidAccessKeyId", "SignatureDoesNotMatch", "InvalidToken", "ExpiredToken"].includes(code)) {
          reason = "check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and any session-token credentials";
        } else if (code === "NoSuchBucket" || code === "NotFound" || statusCode === 404) {
          reason = "the bucket does not exist at this endpoint; check S3_BUCKET and S3_ENDPOINT";
        } else if (code === "AccessDenied" || statusCode === 403) {
          reason = "access denied; check storage credentials and bucket permissions (HeadBucket requires s3:ListBucket)";
        } else {
          reason = "check S3_ENDPOINT, S3_REGION, and whether the storage service is reachable";
        }
        throw new Error(`Storage preflight failed for bucket "${process.env.S3_BUCKET}" (${code}): ${reason}`);
      }
      storage = s3Storage({
        s3,
        Bucket: process.env.S3_BUCKET,
        Key: (_request: unknown, file: ImportImage, callback: Function) => {
          callback(null, `${randomUUID()}.${file.outputFormat}`);
        },
        multiple: true,
        resize: (models.Image as any).getSharpVersions("post-header"),
        toFormat: "png",
      });
    }

    const defaultStatus =
      group.configuration?.allPostsBlockedByDefault === true
        ? "blocked"
        : "published";

    let created = 0;
    let skipped = 0;
    let imagesAttached = 0;
    let imagesSkipped = 0;
    let imagesToUpload = 0;

    const uploadedImages: any[] = [];
    const transaction = await models.sequelize.transaction();
    let transactionFinished = false;
    try {
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (!row.hasValues) continue;

        const name = cellText(row, "Post name");
        const description = cellText(row, "Description");
        if (!name || !description) {
          throw new Error(`Row ${i}: missing Post name or Description`);
        }
        const user = defaultAuthor;

        const duplicate = await (models.Post as any).unscoped().findOne({
          where: { group_id: groupId, user_id: user.id, name, deleted: false },
          attributes: ["id"],
          transaction,
        });
        if (duplicate) {
          log.info(
            `Row ${i}: skipping duplicate of post ${duplicate.id} "${name}"`
          );
          skipped++;
          if (imageFiles.has(i)) imagesSkipped++;
          continue;
        }

        const categoryName = cellText(row, "Category");
        let categoryId: number | null = null;
        if (categoryName) {
          const categoryKey = categoryName.toLowerCase();
          categoryId = categoryIdByName.get(categoryKey) ?? null;
          if (categoryId === null) {
            const category = await (models.Category as any).create(
              {
                name: categoryName,
                description: "",
                group_id: groupId,
                user_id: user.id,
              },
              { transaction }
            );
            const createdCategoryId: number = category.id;
            categoryId = createdCategoryId;
            categoryIdByName.set(categoryKey, createdCategoryId);
          }
        }

        const Post = models.Post as any;
        const post = await Post.create(
          {
            name,
            description,
            group_id: groupId,
            category_id: categoryId,
            user_id: user.id,
            status: "published",
            language: null,
            counter_endorsements_up: 0,
            content_type: Post.CONTENT_IDEA,
            cover_media_type: "image",
            user_agent: "xls-import",
            ip_address: "127.0.0.1",
            data: {
              contact: {},
              attachment: {},
            },
            public_data: {},
          },
          { transaction }
        );

        const imageFile = imageFiles.get(i);
        if (imageFile) imagesToUpload++;
        if (imageFile && storage) {
          const uploaded = await new Promise<any>((resolve, reject) => {
            storage!._handleFile({}, {
              originalname: imageFile.filename,
              mimetype: imageFile.mimetype,
              outputFormat: imageFile.outputFormat,
              stream: createReadStream(imageFile.filePath),
            }, (error: unknown, result: unknown) => error ? reject(error) : resolve(result));
          });
          uploadedImages.push(uploaded);
          const Image = models.Image as any;
          const formats = Image.createFormatsFromSharpFile(uploaded);
          if (!formats.length) throw new Error(`Row ${i}: upload returned no image URLs`);
          const image = await Image.create({
            user_id: user.id,
            s3_bucket_name: process.env.S3_BUCKET,
            original_filename: imageFile.filename,
            formats: JSON.stringify(formats),
            user_agent: "xls-import",
            ip_address: "127.0.0.1",
          }, { transaction });
          await post.addPostHeaderImage(image, { transaction });
          imagesAttached++;
        }
        created++;

        if (!(await group.hasGroupUser(user, { transaction }))) {
          await group.addGroupUser(user, { transaction });
          await group.increment("counter_users", { transaction });
        }
        if (!(await community.hasCommunityUser(user, { transaction }))) {
          await community.addCommunityUser(user, { transaction });
          await community.increment("counter_users", { transaction });
        }
        if (!(await domain.hasDomainUser(user, { transaction }))) {
          await domain.addDomainUser(user, { transaction });
          await domain.increment("counter_users", { transaction });
        }
      }

      if (created > 0) {
        await group.increment("counter_posts", { by: created, transaction });
        await community.increment("counter_posts", { by: created, transaction });
        await domain.increment("counter_posts", { by: created, transaction });
      }

      if (dryRun) {
        await transaction.rollback();
        transactionFinished = true;
        log.info("Dry run: changes rolled back");
      } else {
        await transaction.commit();
        transactionFinished = true;
      }
      log.info(
        `Import ${dryRun ? "(dry run) " : ""}completed: ${created} posts created, ${skipped} duplicates skipped`
      );
      log.info(
        `Images: ${imageFiles.size} referenced, ${uploadedImages.length} uploaded, ${imagesAttached} attached, ${imagesSkipped} skipped` +
          (dryRun ? `; ${imagesToUpload} would be uploaded` : "")
      );
      process.exit(0);
    } catch (error) {
      if (!transactionFinished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          log.error(rollbackError);
        }
        for (const uploaded of uploadedImages) {
          try {
            await new Promise<void>((resolve, reject) => {
              storage!._removeFile({}, uploaded, (cleanupError: unknown) => {
                if (cleanupError) reject(cleanupError);
                else resolve();
              });
            });
          } catch (cleanupError) {
            log.error(`Failed to clean up image upload ${JSON.stringify(uploaded)}: ${cleanupError}`);
          }
        }
      }
      throw error;
    }
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
})();
