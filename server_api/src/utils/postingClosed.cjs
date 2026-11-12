"use strict";

// The group's "can add new posts" setting was only ever read by the client, so
// closing submissions hid the buttons but the API kept accepting posts from
// open tabs and direct calls. Only an explicit false closes the group, as
// groups created before the setting existed have no value for it.
function isPostingClosed(group) {
  return Boolean(group && group.configuration && group.configuration.canAddNewPosts === false);
}

module.exports = { isPostingClosed };
