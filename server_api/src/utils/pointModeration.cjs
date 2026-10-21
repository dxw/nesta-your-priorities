"use strict";

const QUEUED_STATUS = "in_moderation_queue";

const initialPointStatus = (postId) => (postId ? QUEUED_STATUS : "published");

const isQueuedPostPoint = (point) =>
  Boolean(point && point.status === QUEUED_STATUS && point.post_id);

// Does the public side effects that point creation skips for queued points
const publishApprovedPostPoint = async (models, req, point) => {
  const post = await models.Post.findOne({
    where: { id: point.post_id },
    attributes: ["id", "counter_points", "group_id"],
  });
  if (!post) {
    throw new Error("Post not found for approved point");
  }

  const group = await models.Group.findOne({
    where: { id: point.group_id },
    attributes: ["id", "community_id"],
    include: [{ model: models.Community, attributes: ["id", "domain_id"] }],
  });

  await new Promise((resolve, reject) => {
    models.AcActivity.createActivity(
      {
        type: "activity.point.new",
        userId: point.user_id,
        domainId:
          group && group.Community
            ? group.Community.domain_id
            : req.ypDomain && req.ypDomain.id,
        groupId: point.group_id,
        postId: point.post_id,
        pointId: point.id,
        access: models.AcActivity.ACCESS_PUBLIC,
      },
      (error) => (error ? reject(error) : resolve())
    );
  });

  await new Promise((resolve, reject) => {
    post.updateAllExternalCounters(req, "up", "counter_points", (error) =>
      error ? reject(error) : resolve()
    );
  });
  await post.increment("counter_points");
};

module.exports = {
  initialPointStatus,
  isQueuedPostPoint,
  publishApprovedPostPoint,
};
