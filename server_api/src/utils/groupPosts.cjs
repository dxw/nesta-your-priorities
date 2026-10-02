"use strict";

// Whether a group has any published post with a non-open official status.
// The client only needs a yes or no (it decides whether to show the status
// tabs), so this asks for the first matching row and stops, rather than
// counting every matching post. The index on (group_id, official_status,
// deleted, status) makes that a single index probe however many ideas the
// group holds; the count grew with the group.
function hasNonOpenPosts(models, groupId) {
  return models.Post.scope("not_open")
    .findOne({ attributes: ["id"], where: { group_id: groupId }, raw: true })
    .then((row) => row != null);
}

module.exports = { hasNonOpenPosts };
