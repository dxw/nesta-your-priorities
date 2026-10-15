# Server-side vote limit enforcement

Currently, the Small Ideas Initiative site only allows users to submit ideas and not to vote. In phase 2, we'll invert this, switching off idea submission and switching on voting.

The [project proposal](https://docs.google.com/document/d/1SyJs8R78bOc1PQwEizpqqHnO0GLRgvkRQ-wUSDbhscA/edit?tab=t.0) has the following point:

> **Server-side vote limit enforcement**
> 
> Max votes config exists but is client side only (config disables button in the UI).

Additionally, "voting should be anonymous" ([Slack](https://dxw.slack.com/archives/C0B72GNJA20/p1791886785089029)).

So I've gotten Claude to verify this claim and to investigate how we'd enforce a maximum number of votes per user.

## Assumptions

The requirements are not clear here yet, so I've had to make assumptions. In particular, I've:

- investigated how to implement a server-side version of the existing client-side check; that is, how to limit each Your Priorities `User` to a maximum number of up-votes across all posts in a group — we still need to answer the question of how we wish to prevent people from voting multiple times if we don't have a concept of user identity, which we'll have to discuss as a team and possibly with the client
- assumed that "voting should be anonymous" does not mean that _admins_ shouldn't be able to see who voted for what
- assumed that "voting should be anonymous" means that we do not want users to be forced to register an account or prove their identity in order to vote

## How this document was created

Investigated on 2026-10-14.

> [!important]
> The rest of this document is Claude-written and lightly human-edited; it shouldn't be put in front of the client as-is.

> [!note]
> Links to code are pinned to `731b6c1` on `master`, i.e. the code before the sketch of a fix ([`a8bd768`](https://github.com/dxw/nesta-your-priorities/commit/a8bd768128c9fa2a31a9c98f98d827b93beae338)), so their line numbers stay correct.

## Summary

- **The claim "Max votes config exists but is client side only (config disables button in the UI)" is correct.** `maxNumberOfGroupVotes` caps the number of up-votes one user can have across all posts in a group, but only the client checks it. The API accepts any number of votes; [`prove-vote-limit-bypass.mjs`](prove-vote-limit-bypass.mjs) demonstrates this. One vote per user per post is already enforced.
- **Enforcing the vote limit on the server is straightforward:** a count and a lock in the vote endpoint. A working sketch is in [`a8bd768`](https://github.com/dxw/nesta-your-priorities/commit/a8bd768128c9fa2a31a9c98f98d827b93beae338). One possible snag: every author automatically up-votes their own idea, which counts towards their limit, though this probably won't matter for the voting round (see below).
- **Enforcing at a per-`User` level might not be helpful when it's easy to create a new anonymous user:** each session gets a new (anonymous) `User`, which lasts until the browser is quit or there are 24 hours of inactivity. So a server-side limit is per session: it stops people bypassing the UI, but clearing cookies gives a fresh allowance. Stopping repeat voting needs some identity signal (login, invite codes, IP heuristics), which trades off against anonymity.
- **"Anonymous" voting**:
    - **Votes are traceable by admins.** Each vote stores the user, IP address and user agent, and the fraud management screens show them along with the user's email. Through the user, a vote can also be linked to the contact details on any idea submitted in the same session.
    - **Votes aren't visible to other users**, except that a post's author is notified of votes on it, which names the voter. An existing community setting turns this off.
- **The trade-off:** the more anonymous voting is, the weaker the vote limit becomes.
- **Your Priorities's built-in fraud detection tool doesn't prevent users from voting.** It's an after-the-fact admin tool (see the full investigation in [`docs/fraud-management.md`](../../fraud-management.md)).

## How the limit works today

- **Config:** the group setting `maxNumberOfGroupVotes`, shown in the group admin UI as "Maximum number of votes per user" on the **Vote settings** tab. The server saves it ([`server_api/src/controllers/groups.cjs:810`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/server_api/src/controllers/groups.cjs#L810)) but never checks it.
- **Server:** `POST /posts/:id/endorse` ([`server_api/src/controllers/posts.cjs:2543`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/server_api/src/controllers/posts.cjs#L2543)) checks login, permission and `canVote`, then creates or updates the vote. There's no limit check.
- **Client:** at login it loads all of the user's votes (`GET /users/loggedInUser/isloggedin`), counts the up-votes in the group locally (`calculateVotesLeftForGroup`, [`webApps/client/src/yp-app/YpAppUser.ts:709`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/webApps/client/src/yp-app/YpAppUser.ts#L709)), updates the count after each vote, and disables the vote button at the limit ([`webApps/client/src/yp-post/yp-post-actions.ts:440`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/webApps/client/src/yp-post/yp-post-actions.ts#L440)). Down-votes and withdrawals aren't blocked.

**Demonstration:** against a local group with a limit of 2 and three posts, the script registered an anonymous user and up-voted all three posts; the server accepted all three.

```
node docs/investigations/server-side-vote-limit/prove-vote-limit-bypass.mjs --group-id 1 --post-ids 1,2,3 --max 2
```

## Anonymous users and sessions

- With `allowAnonymousUsers` / `allowAnonymousAutoLogin` on (as in our group setup), the client calls `POST /users/register_anonymously` ([`server_api/src/controllers/users.cjs:265`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/server_api/src/controllers/users.cjs#L265)), which creates a real `User` with a made-up email (`<sessionID>_anonymous@citizens.is`). Votes are stored per user (one `Endorsement` row per user per post), so in effect per session.
- **How long a session lasts:** the session cookie has no expiry, so it lasts until the browser is quit (or longer, if the browser restores sessions). The server-side session expires after 24 hours of inactivity ([`server_api/src/app.ts:632`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/server_api/src/app.ts#L632)). After either, the person becomes a new anonymous user with a fresh vote allowance.
- **Contact details:** the idea form's contact fields are saved as plain JSON on the post (`post.data.contact`), not on the user. But the post also stores the `user_id`, IP and user agent, so ideas and votes from the same session are linked.

## Anonymous voting

### What identifies a voter

Each vote stores `user_id`, `ip_address`, `user_agent`, fingerprint fields (empty since fingerprinting was removed in `84ce547`) and `created_at`. It's also recorded in an activity row (`AcActivity`, with `userId` and `postId`) and in the server logs. The fraud management screen and its audit report show the IP, user agent and user email.

### What other users see

Nothing shows other users who voted for what: posts only carry totals, newsfeeds exclude votes, and a user's votes are only returned to that user. The exception is notifications to a post's author, which name the voter (anonymous voters appear as "Anonymous User"; registered ones by name). The community setting `muteNotificationsForEndorsements` turns these off.

## Enforcing the limit on the server

### What needs changing

1. **`POST /posts/:id/endorse`:** when a vote adds a new up-vote, count the user's up-votes in the group (the same rule as the client) and reject the vote at the limit. Down-votes, withdrawals and re-sent up-votes don't need checking.
2. **The automatic up-vote on post creation** ([`server_api/src/controllers/posts.cjs:1811`](https://github.com/dxw/nesta-your-priorities/blob/731b6c1b35c238f6125af55b744d108b3aa8ec5b/server_api/src/controllers/posts.cjs#L1811)): see below.
3. **The client:** handle the rejection with a "you've used all your votes" message. It must not be a 401, which the client treats as "log in again".
4. **Tests:** there's no test for the vote endpoint yet.

> [!important]
> Every new idea is automatically up-voted by its author, and that vote currently counts towards their limit: someone who submits two ideas in a group with a limit of 2 has no votes left.
>
> Whether this matters or not will depend on where the `Post`s for the voting round come from. At the time of writing, we're considering ([Slack](https://dxw.slack.com/archives/C0B72GNJA20/p1791970712069589)) creating a _new group_ and importing the shortlist of questions into it as new `Post`s, so it would depend on how these `Post`s are created (a script that creates them directly wouldn't trigger the automatic up-vote at all) and what author they have; we may choose to sever them from their original author's `user_id`.
>
> Also given the two-phase approach with a large time separation between the phases, it's likely that not many of our anonymous users have their original session hanging around still anyway.
>
> Otherwise, we'd need to exclude authors' own ideas from the count (on both server and client), stop the automatic up-vote, or accept it.

### Locking

Without a lock, two simultaneous votes from one user can both count the existing votes before either saves, and both get through. The sketch locks the user's row (`SELECT … FOR UPDATE`) inside a transaction, so that each user's votes are processed one at a time; other users aren't affected. A Postgres advisory lock would also work.

Processing each user's votes one at a time also stops two simultaneous first votes on the same post creating two vote rows, which is currently possible because the `(user_id, post_id)` index on votes isn't unique.

The race matters less for anonymous groups, since a new session already gives a fresh allowance, but the lock is only a few lines.

### The sketch

> [!warning]
> This is a proof of concept, not intended for merging as-is.

[`a8bd768`](https://github.com/dxw/nesta-your-priorities/commit/a8bd768128c9fa2a31a9c98f98d827b93beae338) implements point 1 and the lock, returning 403 with `{"error":"voteLimitReached"}`. Its commit message has the details and test results. In short: with votes sent one at a time or in parallel, the server accepts 2 and rejects the 3rd; with the lock removed, parallel votes all get through.
