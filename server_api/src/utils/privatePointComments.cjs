"use strict";

const ADMIN_ONLY_COMMENT_STATUS = "admin_only";

const isAdminOnlyComment = (models, point) =>
  Boolean(
    point &&
      point.content_type === models.Point.CONTENT_COMMENT &&
      point.status === ADMIN_ONLY_COMMENT_STATUS
  );

const getPointSubmissionAttributes = (pointModel, postId) =>
  postId
    ? {
        content_type: pointModel.CONTENT_COMMENT,
        status: ADMIN_ONLY_COMMENT_STATUS,
      }
    : {
        content_type: pointModel.CONTENT_DEBATE,
        status: "published",
      };

module.exports = {
  ADMIN_ONLY_COMMENT_STATUS,
  isAdminOnlyComment,
  getPointSubmissionAttributes,
};