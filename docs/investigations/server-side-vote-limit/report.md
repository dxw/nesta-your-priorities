# Server-side vote limit enforcement: starting-point report

Investigated 2026-10-14 on branch `add-script-to-create-group`.

Requirement: "Max votes config exists but is client side only (config disables button in the UI)." The claim is correct: the limit is only enforced in the browser. This has been confirmed by calling the API directly (see "Proof: bypassing the limit through the API" in section 1). A sketch of a server-side fix, with test results, is in section 6. Testing also turned up an existing bug with simultaneous votes, in section 7.

**What the setting means:** `maxNumberOfGroupVotes` caps the number of **up-votes one user can have across all posts in a group**. Down-votes don't count towards it, and withdrawing a vote frees up a slot. There's no per-post setting, but **one vote per user per post is already built in**: each vote is up or down, and voting again replaces the old vote (`posts.cjs:2580`).

## 1. How the limit works today

- **Config:** `maxNumberOfGroupVotes` is a group setting in the admin UI (`webApps/client/src/admin/yp-admin-config-group.ts:1368`). The server only saves it (`server_api/src/controllers/groups.cjs:810`) and never checks it anywhere else.
- **Server:** `POST /posts/:id/endorse` (`server_api/src/controllers/posts.cjs:2543`) checks login, the `vote on post` permission and `canVote`, then creates or updates the endorsement. It does no limit check, so anyone calling the API directly can vote without limit.
- **Client:** the limit check is done entirely on a local copy of the user's votes:
  1. **Loading:** on page load and after login, `YpAppUser.checkLogin` (`webApps/client/src/yp-app/YpAppUser.ts:612`) calls `GET /users/loggedInUser/isloggedin` (`server_api/src/controllers/users.cjs:1321`). Through `getUserWithAll`, that endpoint returns **all** of the user's non-deleted endorsements (`id`, `value`, `post_id` and the post's `group_id`; `users.cjs:111`) as `user.Endorsements`, which the client keeps on `window.appUser.user`.
  2. **Counting:** `calculateVotesLeftForGroup` (`YpAppUser.ts:709`) doesn't call the server. It filters the local array by `Post.group_id === group.id` and a value other than `-1` or `0` (in practice, up-votes). The result goes in `groupCurrentVoteCountIndex[group.id]`.
  3. **When it's recalculated:**
     - when a group page loads (`yp-collection/yp-group.ts:935`)
     - when a post page loads (`yp-post/yp-post.ts:1374`)
     - after each successful vote: `yp-post-actions.ts:762` calls `updateEndorsementForPost` (`YpAppUser.ts:671`) with the endorsement the server returned. That function replaces, adds or removes the matching entry in the local array, then recounts.
  4. **Enforcement:** once the limit is reached, `votingStateDisabled` (`webApps/client/src/yp-post/yp-post-actions.ts:439`) disables the vote button. Down-votes and removing an existing vote are not blocked.
- **What this means:**
  - The client never asks the server for a fresh count. The local array only changes at login or after the user's own votes in this tab, so votes cast in another tab aren't seen until the page reloads.
  - The client count is built from the same endorsement rows the server holds, so a server-side check would be the same query moved into the endorse handler. The client logic can stay as it is, for the UI.

### Proof: bypassing the limit through the API

[`prove-vote-limit-bypass.mjs`](prove-vote-limit-bypass.mjs) does what a client can do without the UI:

1. registers an anonymous user (`POST /api/users/register_anonymously`)
2. sends an up-vote (`POST /api/posts/:id/endorse`) for each post given
3. asks `isloggedin` how many up-votes that user now has in the group

It has no dependencies. Options:

- `--parallel` sends all the votes at once instead of one after another, to test for race conditions (see sections 6 and 7).
- `--host-header <host>` sends a different `Host` header from the one in `--base-url`. The server picks the domain from that header, so this lets a second server on another port answer as the usual `localhost:4242` domain. (This is why the script uses `node:http`: `fetch` ignores a custom `Host` header.)

**Run on 2026-10-14 against local dev:**

- **Setup:** group 1, with `canVote` on, `maxNumberOfGroupVotes` set to 2, `allowAnonymousUsers` on and access "open to community". Posts 1, 2 and 3 are all published.
- **Command:**

  ```
  node docs/investigations/server-side-vote-limit/prove-vote-limit-bypass.mjs --group-id 1 --post-ids 1,2,3 --max 2
  ```

- **Output:**

  ```
  Registered anonymous user 6
  Up-vote on post 1: HTTP 200
  Up-vote on post 2: HTTP 200
  Up-vote on post 3: HTTP 200

  User 6 now holds 3 up-votes in group 1 (limit 2).
  PROVEN: the server accepted more votes than the limit.
  ```

- **Database check:** the `endorsements` table has three active rows with `value = 1` for user 6 (posts 1, 2 and 3), and the up-vote totals on those posts went up.

## 2. Are votes stored per user? Yes.

Each vote is an `Endorsement` row (`server_api/src/models/endorsement.cjs`) with `user_id`, `post_id`, `value`, `ip_address`, `user_agent` and a `data` JSONB fingerprint field. There is one row per user per post, which is upserted on revote. The `(user_id, post_id)` index isn't unique, though, so two simultaneous first votes on the same post could create two rows (not tested; see section 7).

## 3. How does this square with "anonymous"?

"Anonymous" in this codebase means users who haven't logged in, not that votes can't be traced:

- With `allowAnonymousUsers` / `allowAnonymousAutoLogin` set (both are on in our `createCommunityAndGroup.ts` script), the client calls `POST /users/register_anonymously` (`server_api/src/controllers/users.cjs:265`). This creates a real `User` with email `<sessionID>_anonymous@citizens.is` and `profile_data.isAnonymousUser = true`.
- Votes are therefore still tied to a `user_id`. That user is just the **session**.
- The session cookie has no `maxAge`, so it lasts only for the browser session, and it is stored in Redis with a 24-hour TTL (`server_api/src/app.ts:632`). See "How long does an anonymous user last?" below.

**What this means for us:** server-side enforcement per user is easy and fits with anonymity. A check in the endorse handler could:

1. Count the user's active up-votes on posts in the group.
2. Reject the vote if the count is already at `maxNumberOfGroupVotes`, unless the user is changing an existing up-vote.

It also needs a lock to stop two simultaneous requests both getting through. Section 6 has a working sketch.

The catch is that with anonymous users, **"per user" really means "per browser session"**. Clearing cookies, using a private window or switching browsers gives a new user and a fresh allowance. Server enforcement would stop people bypassing the UI, but not ballot-stuffing. Stopping that needs some identity signal, such as login, a one-time code or invite, or IP/fingerprint heuristics. All of these trade off against anonymity, and that's the question for the client.

### Contact details and multiple posts from one session

This is related to anonymity but not to the vote limit itself.

- **Where they come from:** our group config turns on `moreContactInformation` and `moreContactInformationAddress` (`createCommunityAndGroup.ts:187`). These add built-in contact fields to the idea form, separate from the structured questions.
- **Where they're stored:** `updatePostData` (`server_api/src/controllers/posts.cjs:1591`) saves them as plain JSON on the post, in `post.data.contact`: `name`, `email`, `telephone`, `address`, `agreeMedia` and `agreeEmail`. They're never written to the `User` record. The anonymous user's email stays the synthetic `<sessionID>_anonymous@citizens.is`.
- **Structured-question answers** go to `post.public_data.structuredAnswersJson`, which is also on the post.
- **They are still linked to the user.** The post row also has `user_id` (the anonymous user), `ip_address` and `user_agent` (`posts.cjs:1772`). So anyone with database or admin access can see that the person who left this email address is the same anonymous user who cast these votes, which in practice de-anonymises those votes.
- **Multiple posts in one browser session belong to the same anonymous user.** Once `register_anonymously` has logged the browser in, every post (and vote) uses `req.user.id` from the session. This lasts until the browser closes or there are 24 hours of inactivity. After that, the next submission creates a new anonymous user.
- **Caveat (not checked):** we're on passport 0.7, which regenerates the session ID at login. That means the `sessionID` in the anonymous email won't match the session ID after login. It doesn't affect the above, because the user is held in the session rather than looked up by email. But `register_anonymously` can't find an existing anonymous user again by recomputing the email, so calling it a second time would probably create a new user.

### How long does an anonymous user last?

A returning person is the same user only if the session still exists. That needs two things to be true:

1. **The browser still has the cookie.** The `yrpri.sid` cookie has no `maxAge` or `expires` (`server_api/src/app.ts:638`), so it's a browser-session cookie. Closing the tab, or keeping it open, doesn't matter. Fully quitting the browser normally deletes the cookie. The exception is browsers set to restore the previous session (e.g. Chrome's "Continue where you left off"), which also keep session cookies, so the cookie can survive for days or weeks.
2. **The server still has the session in Redis.** The store is created with `ttl: 86400` (24 hours). This is a **sliding** expiry: on every request that carries the cookie, express-session calls `store.touch`, and connect-redis 9 resets the TTL. So the session expires after **24 hours of inactivity**, not 24 hours after creation.

| Scenario | Same user? |
|---|---|
| Comes back within 24 hours of their last request, browser not quit | Yes |
| Comes back after more than 24 hours idle, even with the tab left open | No. The server has forgotten the session. |
| Quits the browser (without session restore) and comes back | No. The cookie has gone. |
| Browser with session restore, back within 24 hours of their last activity | Yes |

An idle open tab doesn't keep the session alive unless the page makes requests in the background (not checked).

**When the session has expired:**

- **Tab left open:** the client still has the old user in memory and thinks it's logged in. When they vote, `POST /posts/:id/endorse` returns 401 (`isLoggedInNoAnonymousCheck`). The client then calls `loginFor401` and opens the login dialog (`webApps/client/src/common/YpServerApiBase.ts:78`).
- **Page reloaded or revisited:** `isloggedin` reports that they're not logged in.

Either way they end up as a **new** anonymous user, because the new session has a new session ID and so a new synthetic email. Their old votes and posts stay with the old user, so the new user gets a full vote allowance and their votes aren't linked to their earlier post. (Not tested; see "Not yet investigated".)

**What this means:**

- **Vote limit:** a session-based limit resets after 24 hours of inactivity or a browser restart.
- **Anonymity:** a vote is only linkable to an earlier idea submission (and its contact details) if both happened in the same session.

## 4. Is "fraud detection" related?

It's adjacent, but it's a different mechanism. ([`docs/fraud-management.md`](../../fraud-management.md) is a separate quick reference on setting up and using the fraud management UI.)

- It is an **after-the-fact admin tool**, enabled per community with `enableFraudDetection`. It's in the client at `yp-moderation/yp-fraud-management.ts` and on the server under `services/engine/moderation/fraud/`.
- It scans endorsements, posts, points (comments), ratings and point qualities (helpful/unhelpful votes on comments) for clusters by IP + user agent + post, IP + fingerprint, and so on. It doesn't prevent anything at vote time.
- **What admins can delete:** the flagged items of the content type being scanned. For votes, `FraudDeleteEndorsements.cjs` soft-deletes the endorsement rows by setting `deleted: true`, then recounts the vote totals on the affected posts. There are matching delete classes for the other content types. User accounts are left alone.
- **Its fingerprint signals are currently dead.** Commit `84ce547` ("Remove Fingerprint.js", July 2026) stubbed out `getBrowserFingerprintData` (`YpAppUser.ts:148`) so it always sends empty values. Only the IP and user-agent heuristics still work, and those are unreliable behind shared networks or NAT.

## 5. What would "admins can't tell who voted" require?

### What's stored on an endorsement that could identify someone

Every endorsement row has these fields (`server_api/src/models/endorsement.cjs`, written at `posts.cjs:2604`):

| Field | Used for fraud detection? | Why it identifies someone |
|---|---|---|
| `user_id` | Yes; the fraud UI joins it to `User.email` | It links to the user. For an anonymous user that's the session. **The same `user_id` is on any post that user submitted, and those posts hold contact details in `post.data.contact`.** For a registered user it's their real email. |
| `ip_address` | Yes; one of the main heuristics | It's personal data and can be matched with posts, which also store the IP. |
| `user_agent` | Yes | It narrows things down a lot when combined with the IP. |
| `data.browserId`, `data.browserFingerprint`, `data.browserFingerprintConfidence` | Yes | These are empty at the moment because Fingerprint.js was removed (`84ce547`), but the code to store them is still there. |
| `created_at` | Not directly | Its timing can be matched with post creation in the same session. |

Admins can already see all this. The fraud management UI shows the IP, browser ID, user agent and **email** for each flagged vote (`webApps/client/src/yp-moderation/yp-fraud-management.ts:383-414`), and the fraud audit report exports the same fields (`CreateFraudAuditReport.cjs:291`).

Votes are also recorded in two other places:

- **Activities:** each vote creates an `AcActivity` row with `userId`, `postId` and `endorsementId` (`posts.cjs:2659`). This is a second record of who voted for what.
- **Logs:** the endorse handler logs `userId` and `endorsementId`, and the whole `req.user` on error.

The usual reports (XLS/DOCX) only include vote totals per post, so they're fine.

### What we'd need to change

First we need to agree who "admins" means, because the answer is very different:

**A. People using the admin screens.** This is achievable:

1. Stop storing `ip_address`, `user_agent` and fingerprint data on endorsements, or clear them. There's already a precedent: the anonymisation worker (`server_api/src/services/workers/anonymizations.cjs:208`) reassigns votes to a shared anonymous user and sets the IP to `127.0.0.1`.
2. Turn off fraud detection for endorsements, or at least hide the email, IP and user agent columns. This undermines fraud detection, which is the main trade-off for the client.
3. Stop creating `AcActivity` rows for votes, or don't record the `userId` on them.
4. Remove user identifiers from the endorse-handler logs.

**B. People with database or server access as well.** This is much harder, because enforcing the vote limit and one vote per post **requires** a link between a vote and a voter. Options:

- **Keep the link but make it pseudonymous:** store a keyed hash of the user ID instead of `user_id`. Anyone who has the server secret can still reverse it, so this only deters casual lookups.
- **Separate idea submissions from votes:** stop the same `user_id` appearing on both posts with contact details and votes. For example, give votes their own throwaway identity, or don't link posts that have contact details to the session user. This removes the easiest way to identify a voter: going from the vote to the user, then to their post and its email address.
- **True unlinkability** (blind-signed voting tokens and similar) is a big redesign and probably out of scope.

### The trade-off

**The more anonymous voting is, the weaker both the vote limit and fraud detection get.** If anonymous users are per session, the limit can already be bypassed with a new session. Removing IP and user agent then takes away the only remaining way to catch that after the fact.

### If "anonymous" means other users can't see who voted

We're mostly fine as things are. Nothing shows other users a list of who voted for what. The one exception is the notification a post's author gets, which names the voter.

| Where | Does it show who voted? |
|---|---|
| Post and group API responses | No. Posts only carry the totals (`counter_endorsements_up/down`). I didn't find any endpoint that returns the endorsements on a post. |
| Endorsements on a user | Only to that user: through `isloggedin`, login and the other routes that use `getUserWithAll`. The old `GET /users/:id/endorsements` is commented out (`users.cjs:2464`). |
| Newsfeeds / activity streams | No. Vote activities are marked `ACCESS_PRIVATE`, and the feeds only include post, comment, news-story and status-change activities (`defaultKeyActivities`, `news_feeds_utils.cjs:456`). We also set `hideNewsfeeds` in our config. |
| Reports (XLS/DOCX) | Only totals per post, and these are admin-only anyway. |
| **Notifications to the post's author** | **Yes.** See below. |

**The exception: vote notifications.** Each vote creates an activity, and `generateNotificationsForEndorsements` (`server_api/src/services/engine/notifications/generate_post_notifications.cjs:96`) turns it into a `notification.post.endorsement` for the post's author. The client then shows the voters' names, e.g. "Alice, Bob supported your idea" (`webApps/client/src/ac-notifications/ac-notification-list-post.ts:354`). Whether it's delivered in-app or by email depends on the author's `my_posts_endorsements` notification setting. Anonymous users get this turned on by default.

How much this reveals depends on who voted:

- **Auto-login anonymous voters** are all named "Anonymous User", so the author only learns that someone voted, and whether up or down.
- **With `allowOneTimeLoginWithName`**, the voter is shown under the name they typed.
- **Registered (logged-in) voters** are shown under their real display name.

There's already a way to turn this off: the community setting `muteNotificationsForEndorsements` (`communities.cjs:1055`). It stops these notifications being generated. Setting it in our setup script would close the gap.

In our config, posts are `onlyAdminsCanViewIdeas`, so for now other users can't see much of anything. But the notification is sent to the post's author whatever that setting is.

## 6. Enforcing the limit on the server

### Places that need changing

1. **`POST /posts/:id/endorse` (`server_api/src/controllers/posts.cjs:2543`): the main change.** The handler already loads the group's configuration and the user's existing endorsement on this post. It needs to:
   - only check when the vote adds a new up-vote: a positive value where there's no existing up-vote on this post. Switching a down-vote to an up-vote counts as new; re-sending an up-vote, down-votes and withdrawals don't need checking.
   - count the user's up-votes in the group, using the same rule as the client's `calculateVotesLeftForGroup`
   - reject the vote if the count has reached `maxNumberOfGroupVotes`
   - lock, so that two simultaneous requests can't both pass the check (see "Locking" below)
2. **The automatic up-vote on post creation (`posts.cjs:1811`): needs a decision.** Every new post creates an endorsement with `value: 1` from its author, whatever `canVote` is set to. So the author's own posts already count towards their limit, both in the current client count and in a server check that uses the same rule: someone who submits two ideas in a group with a limit of 2 has no votes left. If we also checked the limit here, users at the limit couldn't submit ideas, or we'd have to skip the up-vote silently. The options are:
   - exclude the author's own posts from the count, and change the client count to match
   - stop the automatic up-vote for these groups
   - accept it as it is

   This is for the client or product owner to decide.
3. **The client: handling the rejection.** `YpServerApiBase` (`webApps/client/src/common/YpServerApiBase.ts:118`) treats a 401 as "log in again" and opens the login dialog, so the rejection must not use 401. A 403 falls through to the general network-error handling. To do this well, `generateEndorsement` (`yp-post-actions.ts:739`) should handle that error specifically: show a "you've used all your votes" toast, using a new translation string, and re-enable the buttons. This should rarely happen in practice, because the button is already disabled at the limit; the main case is voting in another tab.
4. **Tests.** The server tests use `node --test` (`server_api/src/tests/*.test.cjs`), and there's no test for the endorse route. The proof script works as a manual end-to-end check.

**What doesn't need changing:**

- `DELETE /posts/:id/endorse` (`posts.cjs:2782`): it only withdraws votes.
- `copy_utils.cjs` (cloning a group): it copies existing votes as an admin action.
- The anonymisation, deletion and fraud workers: they only update or soft-delete votes.
- Ratings (`customRatings`): a separate mechanism with no limit.

**Changing `maxNumberOfGroupVotes` mid-consultation:** if it's lowered while people are voting, users above the new limit keep their existing votes. They just can't add more until they're under it.

### Locking

**The problem.** The check is "count the votes, then save if under the limit". If one user sends two votes at almost the same moment, both requests can count before either has saved:

```
Request A                          Request B
---------                          ---------
count up-votes → 1
                                   count up-votes → 1   (A hasn't saved yet)
1 < 2, so save vote on post A
                                   1 < 2, so save vote on post B

Result: 3 votes, limit was 2
```

This is a **race condition**. A transaction on its own doesn't fix it: at Postgres's default isolation level (`READ COMMITTED`), B's count can't see A's vote until A commits.

**What a lock does.** It makes the requests take turns: A takes the lock, counts, saves and commits. B waits for the lock, then counts, sees 2 and rejects the vote. The lock only needs to cover one user, so different users don't wait for each other.

**Options:**

- **A. Lock the user's row (chosen).** At the start of the transaction, read the user's row with `SELECT ... FOR UPDATE` (Sequelize: `lock: transaction.LOCK.UPDATE`). It's simple, uses a row that already exists, and is released when the transaction ends. Its only side effect is that anything else locking or updating that user's row waits a few milliseconds.
- **B. Postgres advisory lock** (`pg_advisory_xact_lock(key)`): a named lock not tied to any row, e.g. keyed on user and group. It has no side effects, but needs raw SQL and is less familiar.
- **C. `SERIALIZABLE` isolation:** Postgres rejects one of the conflicting transactions, so we'd need retry logic. More complicated than we need.
- **D. Don't lock:** exploiting the race needs deliberately timed parallel requests and only gains a few votes.

**How much it matters:** for anonymous groups, not much, because getting a new session (e.g. clearing cookies) already gives a whole new allowance. But option A is about five lines and makes the check correct. It also stops one user's simultaneous first votes on the same post creating duplicate rows (see section 2).

### The sketch

This is an uncommitted change to `POST /posts/:id/endorse` in `server_api/src/controllers/posts.cjs`, on branch `add-script-to-create-group`:

1. Start a transaction and lock the user's row.
2. Find the existing endorsement inside that transaction, as before.
3. If the vote would add an up-vote and the group has `maxNumberOfGroupVotes` set, count the user's up-votes in the group. If the count has reached the limit, roll back and return **403** with `{"error":"voteLimitReached"}`.
4. Otherwise save and commit, which releases the lock. The existing code for activities and vote totals then runs unchanged.

`npx tsc` in `server_api` passes. It's a sketch:

- To keep the diff small, the existing post-save code is wrapped in `Promise.resolve().then(...)` rather than re-indented. A proper version would tidy that up.
- The client doesn't handle the 403 specifically yet, so it shows the generic error.

### Test results

| Run | Result |
|---|---|
| Before the fix, one at a time | 3 votes accepted (the original proof) |
| With the fix, one at a time | 2 accepted; the 3rd got **403** |
| With the fix, parallel (×6) | always 2 accepted and 1 got **403** |
| Fix with the lock temporarily removed, parallel | **3 votes accepted**: the race condition, as expected |

So the check is needed for votes sent one at a time, and the lock is needed for votes sent in parallel. The lock was restored afterwards and the file checked against the fixed version.

**Not tested yet:**

- re-sending an up-vote on an already up-voted post while at the limit (should be allowed)
- switching a down-vote to an up-vote at the limit (should be rejected)
- withdrawing a vote and then voting again

## 7. Existing bug: simultaneous first votes stop the dev server

### What happens

When a user who isn't yet a member of the group (which includes every new anonymous user) sends several votes at once, **the dev server process exits**. It happened twice during testing: once on the original code and once with the lock removed.

After saving a vote, the endorse handler calls `changePostCounter` (`server_api/src/controllers/posts.cjs:21`), which calls `Group.addUserToGroupIfNeeded` (`server_api/src/models/group.cjs:429`). That function:

1. checks whether the user is already a member: `group.hasGroupUser(req.user)`
2. if not, adds them: `group.addGroupUser(req.user)`

This is the same check-then-act race as with the vote limit. The parallel votes all checked, found the new user wasn't a member yet, and all tried to insert. `GroupUser` has a primary key on `(group_id, user_id)`, so the second insert fails with a duplicate-key error.

`addGroupUser(...)` has no `.catch`, so the error becomes an **unhandled promise rejection**. The `unhandledRejection` handler in `server_api/src/app.ts:104` then calls `process.exit(1)` whenever `NODE_ENV` isn't `production`.

### How it was confirmed

A second copy of the built server ran from a scratch folder on port 4243, with the original `posts.cjs` and its output logged to a file. The parallel test was run against it with `--host-header localhost:4242`. The log showed three `Endorsements Created` lines, then `Unhandled Rejection` with a stack ending in `GroupUser.bulkCreate` / `BelongsToMany.add`, and then the process exited with code 1.

It's easy to miss in the normal dev setup: Sequelize's error only carries a stack trace among a lot of other output, and `watch-start` runs `nodemon -q`, which hides nodemon's "app crashed" message. nodemon then waits for a file change before restarting the server.

### Effect

- **Production doesn't exit,** because the handler only exits outside `production`. **But the request never gets a response:** the callback for the failed insert never runs, so the client waits until the connection times out. The vote itself is already saved and the post's vote total already updated.
- The same membership code runs after creating a post, so the bug isn't limited to votes.
- **For real users it's mostly theoretical.** A browser normally sends one vote per click, so it would take two vote clicks within a few milliseconds of each other, or a script. Users who are already members of the group aren't affected.
- **The vote-limit lock makes it less likely, but doesn't prevent it.** The sketch commits, releasing the lock, before the membership code runs, so the requests are spread out a little but can still overlap. None of the six parallel runs with the lock hit it.
- **A proper fix:** catch the error in `addUserToGroupIfNeeded`, or add the member with an insert that does nothing if the row already exists (`ON CONFLICT DO NOTHING`).

### Parallel requests more generally

From the code we've read, the codebase doesn't really design for parallel requests from the same user. It's not proven across the whole codebase, but the pattern is consistent:

| Place | Handles parallel requests? |
|---|---|
| Group membership (`addUserToGroupIfNeeded`) | **No.** It checks then inserts, with no error handling. This causes the crash above. |
| Saving a vote (`POST /posts/:id/endorse`) | **No.** It does a find then a create, and the `(user_id, post_id)` index isn't unique, so two simultaneous first votes on the same post could create two rows (not tested). |
| Vote limit | Not applicable; the server never checked it. |
| Vote totals (`post.increment` / `decrement`) | **Yes.** These run as a single `UPDATE ... SET x = x + 1`, so they're safe. |
| Anonymous registration | **Partly.** It also checks then creates, but there's a unique constraint on email, and the handler turns the conflict into a 401 rather than crashing. |

So check-then-act code is common, and it relies on database constraints where they exist, sometimes without handling the error. The race is only safe where both a constraint exists and the error is caught.

If this matters for the project, a targeted audit would be cheap: search the controllers and models for `hasX`/`findOne` followed by `addX`/`create`/`build().save()`, and check each against its constraints and error handling.

## 8. Open questions for the client

1. Does "anonymous" mean "no login required", "other users can't see who voted for what", "admins can't see who voted for what", or some combination? Votes are currently linkable to a session user, IP and user agent, and through the post, to any contact details that user gave. If it means "admins can't see", who counts as an admin: people using the admin screens, or people with database access too? (See section 5.)
2. Is the aim to stop **UI bypass** (easy, per session) or **repeat voting by the same person** (needs an identity signal)?
3. Is fraud detection in scope, given that fingerprinting has been removed?
4. Should the automatic up-vote an author gets on their own idea count towards their vote limit? (See section 6.)

(Voting is currently off, with `canVote: false` in our group setup script, but is planned to be turned on.)

## Not yet investigated

- Whether any admin view or API endpoint other than fraud management shows who voted for what. I didn't find one in a quick search; the old `GET /users/:id/endorsements` endpoint is commented out (`users.cjs:2464`).
- Whether websocket messages carry vote details to other users. The "other users" findings in section 5 come from tracing the code, not testing it.
- Whether an open tab makes background requests that would keep the session alive.
- Exactly what the login dialog does for an anonymous group after a 401, and confirming the expired-session behaviour end to end (e.g. delete the session key in Redis locally, then try to vote).
- Whether the anonymisation worker (`anonymizations.cjs`) also clears `user_agent`, `data` and the matching activity rows. At line 208 it only resets `user_id` and `ip_address`.
- Whether simultaneous first votes on the same post really create duplicate endorsement rows (sections 2 and 7).
- The edge cases of the server-side fix listed under "Test results" in section 6.
- A wider audit of check-then-act code for parallel requests (section 7).
