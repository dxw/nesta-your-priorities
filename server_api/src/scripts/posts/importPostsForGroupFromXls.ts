import ExcelJS from "exceljs";
import moment from "moment";
import { parseArgs } from "node:util";
import models from "../../models/index.cjs";
import log from "../../utils/loggerTs.js";

// Expects the column layout produced by the group XLS export (xls_group_report.cjs)
const ALLOWED_STATUSES = ["published", "blocked"];
const TEXT_ANSWER_TYPES = [
  "textfield",
  "textarea",
  "textfieldlong",
  "textarealong",
  "numberfield",
];

const usage =
  "Usage: node importPostsForGroupFromXls.js <xlsFilePath> <groupId> [--dry-run] [--default-author-id <userId>]";

const isTruthy = (value: string) =>
  ["true", "yes", "1", "on"].includes(value.trim().toLowerCase());

const parseCreatedAt = (cell: ExcelJS.Cell, rowNumber: number): Date => {
  if (cell.value instanceof Date) {
    return cell.value;
  }
  const text = cell.text.trim();
  if (!text) {
    return new Date();
  }
  const parsed = moment(text, "DD/MM/YY HH:mm", true);
  if (!parsed.isValid()) {
    throw new Error(`Row ${rowNumber}: invalid Created date "${text}"`);
  }
  return parsed.toDate();
};

(async () => {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        "dry-run": { type: "boolean", default: false },
        "default-author-id": { type: "string" },
      },
    });
    const dryRun = values["dry-run"];
    const [filePath, groupIdArg] = positionals;
    const groupId = Number(groupIdArg);

    if (positionals.length !== 2 || !filePath || !Number.isInteger(groupId) || groupId <= 0) {
      log.info(usage);
      process.exit(1);
    }

    let defaultAuthor = null;
    if (values["default-author-id"] !== undefined) {
      const defaultAuthorId = Number(values["default-author-id"]);
      if (!Number.isSafeInteger(defaultAuthorId) || defaultAuthorId <= 0) {
        throw new Error("--default-author-id must be a positive integer");
      }
      defaultAuthor = await models.User.findByPk(defaultAuthorId);
      if (!defaultAuthor) {
        throw new Error(`Default author ${defaultAuthorId} not found`);
      }
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

    for (const required of defaultAuthor ? ["Post name"] : ["Post name", "Email"]) {
      if (!columns.has(required)) {
        throw new Error(`Missing required column "${required}"`);
      }
    }

    const questions: YpStructuredQuestionData[] =
      group.configuration?.structuredQuestionsJson || [];
    // uniqueId may be stored as a number in the group configuration
    const questionsById = new Map(
      questions
        .filter((q) => q.uniqueId !== undefined && q.uniqueId !== null && q.uniqueId !== "")
        .map((q) => [String(q.uniqueId).trim(), q])
    );

    // Export headers for structured questions are "<uniqueId>-<question text>"
    const answerColumns: { uniqueId: string; col: number }[] = [];
    for (const [header, col] of columns) {
      const dash = header.indexOf("-");
      if (dash <= 0) continue;
      const question = questionsById.get(header.slice(0, dash).trim());
      if (!question) continue;

      if (question.text.trim() !== header.slice(dash + 1).trim()) {
        throw new Error(
          `Column "${header}" does not match group question ${question.uniqueId}: "${question.text}"`
        );
      }
      if (!TEXT_ANSWER_TYPES.includes(question.type.toLowerCase())) {
        throw new Error(
          `Question ${question.uniqueId} has unsupported type "${question.type}"`
        );
      }
      answerColumns.push({ uniqueId: question.uniqueId!, col });
    }

    if (questionsById.size > 0 && answerColumns.length === 0) {
      const groupQuestions = [...questionsById.entries()]
        .map(([id, q]) => `${id}-${q.text}`)
        .join(" | ");
      throw new Error(
        `Group has structured questions but no matching columns were found. ` +
          `Group questions: ${groupQuestions}. ` +
          `XLS headers: ${[...columns.keys()].join(" | ")}`
      );
    }

    const categories = await (models.Category as any).findAll({
      where: { group_id: groupId },
      attributes: ["id", "name"],
    });
    const categoryIdByName = new Map<string, number>(
      categories.map((c: any) => [c.name.trim().toLowerCase(), c.id])
    );

    const cellText = (row: ExcelJS.Row, header: string) => {
      const col = columns.get(header);
      return col ? row.getCell(col).text.trim() : "";
    };

    const defaultStatus =
      group.configuration?.allPostsBlockedByDefault === true
        ? "blocked"
        : "published";

    let created = 0;
    let skipped = 0;
    let usersCreated = 0;

    const transaction = await models.sequelize.transaction();
    try {
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (!row.hasValues) continue;

        const name = cellText(row, "Post name");
        const email = cellText(row, "Email").toLowerCase();
        if (!name || (email ? !email.includes("@") : !defaultAuthor)) {
          throw new Error(`Row ${i}: missing Post name or valid Email`);
        }

        const status = cellText(row, "Status").toLowerCase() || defaultStatus;
        if (!ALLOWED_STATUSES.includes(status)) {
          throw new Error(`Row ${i}: unsupported Status "${status}"`);
        }

        const createdAtCol = columns.get("Created");
        const createdAt = createdAtCol
          ? parseCreatedAt(row.getCell(createdAtCol), i)
          : new Date();

        let user = email
          ? await models.User.findOne({
              where: { email },
              transaction,
            })
          : defaultAuthor;
        if (!user) {
          user = await models.User.create(
            {
              email,
              name: cellText(row, "User name") || email.split("@")[0],
              status: "active",
            },
            { transaction }
          );
          usersCreated++;
        }

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
          continue;
        }

        const categoryName = cellText(row, "Category").toLowerCase();
        const categoryId = categoryName
          ? categoryIdByName.get(categoryName) ?? null
          : null;
        if (categoryName && !categoryId) {
          log.warn(`Row ${i}: category "${categoryName}" not found in group`);
        }

        const structuredAnswersJson: YpStructuredAnswer[] = answerColumns.map(
          ({ uniqueId, col }) => ({
            uniqueId,
            value: row.getCell(col).text.trim(),
          })
        );

        const Post = models.Post as any;
        await Post.create(
          {
            name,
            description: "",
            group_id: groupId,
            category_id: categoryId,
            user_id: user.id,
            status,
            language: cellText(row, "Locale") || null,
            counter_endorsements_up: 0,
            content_type: Post.CONTENT_IDEA,
            user_agent: "xls-import",
            ip_address: "127.0.0.1",
            created_at: createdAt,
            data: {
              contact: {
                name: cellText(row, "Contact Name") || null,
                email: cellText(row, "Contact Email") || null,
                telephone: cellText(row, "Contact telephone") || null,
                address: cellText(row, "Contact Address") || null,
                agreeMedia: isTruthy(cellText(row, "Agree Media")),
                agreeEmail: isTruthy(cellText(row, "Agree Email")),
              },
              attachment: {},
            },
            public_data: answerColumns.length > 0 ? { structuredAnswersJson } : {},
          },
          { transaction }
        );
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
        log.info("Dry run: changes rolled back");
      } else {
        await transaction.commit();
      }
      log.info(
        `Import ${dryRun ? "(dry run) " : ""}completed: ${created} posts created, ${skipped} duplicates skipped, ${usersCreated} users created`
      );
      process.exit(0);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
})();
