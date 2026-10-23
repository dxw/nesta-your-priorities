# Import posts from a spreadsheet

This CLI imports new ideas into an existing group. It does not create the group,
configure questions, or update existing posts.

## Prepare the spreadsheet

1. Create the target group and configure its structured questions first.
2. Export that group's spreadsheet to obtain the exact question IDs and headers.
3. Populate the first worksheet with ideas and answers, keeping the header row first.
4. Save as a genuine Excel Workbook (`.xlsx`). Older `.xls` files, CSV files, and
   HTML tables must be converted with Excel or LibreOffice; renaming the extension
   is not a conversion.

`Post name` is the idea's title and is required for every row. `Email` identifies
the author. If the column is missing or a cell is blank, provide
`--default-author-id <userId>` to use an existing account, such as an admin.
Supplied emails take precedence over the default; invalid nonblank emails fail
the import. Unknown email authors are created, but a default author must already
exist. The option neither grants nor verifies admin rights.

Find the existing author's numeric ID in the target environment's database:

```sql
SELECT id, name, email
FROM users
WHERE LOWER(email) = LOWER('admin@example.org');
```

Structured answer headers must be exactly `<uniqueId>-<question text>`, for
example `3-Summary`. Both the ID and text must match the target group, not the
group from which an older spreadsheet was exported. The importer stores each
cell as an answer to that question. Only `textfield`, `textarea`, `textfieldlong`,
`textarealong`, and `numberfield` question types are supported.

A matching ID with different text fails validation. Unknown question IDs are
ignored; if the group has questions but none of the columns match, validation
fails. Use the target group's current export to avoid silently omitting answers
when only some columns match.

## Import cover images

Add an optional `Image filename` column. Each idea can have one cover image;
leave the cell blank to import an idea without an image. The exported `Images`
column is not an alias: rename it to `Image filename` if it contains local filenames.
Supplying `--images-dir` without the exact `Image filename` header is an error,
including during dry runs.

| Post name        | Image filename |
| ---------------- | -------------- |
| Community garden | garden.jpg     |
| Cycle path       | cycle-path.png |
| More benches     |                |

Place all images in a single folder. Use filenames only, not URLs, full paths,
subfolder paths, or embedded spreadsheet images. Symlinks outside the folder are
rejected. Supported formats are JPEG, PNG, GIF, WebP, and TIFF, up to 50 MB and
40 million decoded pixels per file, including animation frames.

Both the spreadsheet path and `--images-dir` are resolved from the shell's
current working directory. The filename cells are resolved within `--images-dir`,
not relative to the spreadsheet. For this layout:

```text
repository/
  import.xlsx
  upload-images/
    garden.jpg
    cycle-path.png
  server_api/
```

run from `server_api` with `../import.xlsx` and `--images-dir ../upload-images`.

All referenced files are validated before the import transaction or uploads
begin. A missing or invalid file stops the entire import, even for a duplicate
post or during a dry run. The importer uses the normal post-header resize
presets and stores image records and associations in the import transaction.

## Complete local example

Run these commands from `server_api` in the same terminal. PostgreSQL and the
local S3-compatible service must be running, with an existing database, target
group, author account, and bucket. Check that you are using the intended
environment before proceeding.

Do not source the entire backend startup script: it also starts the application
watcher. Configure only the variables the importer needs. For a standalone local
import, leave `NODE_ENV` unset to use `YP_DEV_DATABASE_*` without triggering the
model initializer's development schema sync. Also unset any explicit sync flags;
schema/index initialization is outside the importer's rollback transaction.

```sh


npm run build:dev

node ts-out/scripts/posts/importPostsForGroupFromXls.js ../import.xlsx <groupId> \
  --default-author-id <adminUserId> --images-dir ../upload-images --dry-run
```

Replace the example connection details and `<...>` placeholders with
your actual values. Storage credentials must belong to the running service;
setting client environment variables does not create a storage account. Do not
assume that credentials in an old startup script are still valid.

Use a dedicated storage access key with appropriate permissions. Ensure the backend uses the same
working storage configuration and restart it if normal app uploads also fail.

After a successful dry run, review the totals, then run the real import:

```sh
node ts-out/scripts/posts/importPostsForGroupFromXls.js ../import.xlsx <groupId> \
  --default-author-id <adminUserId> --images-dir ../upload-images
```

Dry runs validate local files and execute database work inside a transaction that
is rolled back. They do not contact storage, upload objects, or create image
records. They therefore cannot confirm storage credentials or permissions.

Real runs with image references send `HeadBucket` before opening the import
transaction. This verifies bucket accessibility and requires `s3:ListBucket`.
It does not test `s3:PutObject`, public image readability, or `s3:DeleteObject`
cleanup permission; these must also be configured as appropriate. No test object
is written by the preflight.

On failure before commit, the transaction is rolled back and completed uploads
are deleted. Cleanup failures are logged for manual removal. Forced process
termination cannot guarantee cleanup.

## Totals and reruns

A successful import logs post/user totals followed by an image summary:

```text
Images: 4 referenced, 3 uploaded, 3 attached, 1 skipped
```

Counts are per spreadsheet row, not per unique filename or resized variant.
`skipped` counts image references on duplicate posts. Dry runs report zero
uploaded/attached images and append how many would be uploaded after duplicate
checks. References validated on a duplicate row are still included in `referenced`.

Duplicates are matched by target group, resolved author ID, and `Post name`.
The spreadsheet's `Post Id` does not control duplicate detection. Reruns skip
existing posts entirely: they do not update answers, replace images, or attach
images omitted by an earlier import.

To intentionally create additional posts, use different titles or a different
target group. This leaves existing posts unchanged and may create visible
duplicates; do not change titles merely to retry a failed import.

## Troubleshooting

| Error or symptom                                                   | Action                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password authentication failed, especially for your macOS username | Configure all `YP_DEV_DATABASE_*` variables in the importer terminal. Check the database name and actual credentials. Local runs do not use `DATABASE_URL`; production runs with `NODE_ENV=production` do.        |
| Can't find end of central directory / is this a zip file?          | Convert the original file to a genuine `.xlsx` workbook with Excel or LibreOffice. Do not just rename it.                                                                                                             |
| Group has structured questions but no matching columns             | Confirm the target group ID and use its current exported question headers. The importer does not create or remap questions.                                                                                             |
| `--images-dir requires an "Image filename" column`               | Rename the filename column exactly. `Images` is not supported as an alias.                                                                                                                                            |
| Missing image / `ENOENT`                                         | Check the filename spelling and case, and paths from the current working directory. From `server_api`, a sibling root-level image directory is `../upload-images`, not `upload-images`.                           |
| `S3_BUCKET is required to upload images`                         | Configure storage variables in the same terminal as the importer; backend process settings are not automatically inherited.                                                                                             |
| `InvalidAccessKeyId` or `SignatureDoesNotMatch`                | Use credentials accepted by the running storage service, not assumed defaults. Check the endpoint and clear a stale `AWS_SESSION_TOKEN` when using a local permanent key pair. Never paste secrets into logs or chat. |
| Storage preflight fails with 403                                   | Check credentials and `s3:ListBucket` permission. A 403 alone does not distinguish an unknown account from insufficient permissions.                                                                                  |
| Storage preflight fails with 404                                   | Confirm the bucket already exists at the configured endpoint. The importer does not create buckets.                                                                                                                     |
| Connection refused / storage endpoint error                        | Start the storage service and check its published port, `S3_ENDPOINT`, and region.                                                                                                                                    |
| Dry run succeeds but real upload fails                             | Dry runs do not contact storage. Check bucket access, object-write permissions, and any ACL restrictions.                                                                                                               |
| Import succeeds but expected images are absent                     | Review the image totals, blank filename cells, and duplicate counts. Existing posts are not updated. Also check that image URLs are reachable by the browser.                                                           |
| `error: urlToImage`                                              | The shared image model currently logs a normal URL diagnostic at error level. This line alone is not an upload failure; check the final summary and exit status.                                                        |
| Source changes have no effect                                      | Rebuild with `npm run build:dev` before running the compiled script in `ts-out`.                                                                                                                                    |

## Tests

Run the focused importer tests from `server_api` without a database or live uploads:

```sh
TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm --test src/tests/importPostsForGroupFromXls.test.ts
```
