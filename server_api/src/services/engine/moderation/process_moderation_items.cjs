const queue = require('../../workers/queue.cjs');
const models = require("../../../models/index.cjs");
const async = require('async');
const log = require('../../../utils/logger.cjs');
const _ = require('lodash');
const getAnonymousUser = require('../../utils/get_anonymous_system_user.cjs');
const domainIncludes = require('./get_moderation_items.cjs').domainIncludes;
const communityIncludes = require('./get_moderation_items.cjs').communityIncludes;
const groupIncludes = require('./get_moderation_items.cjs').groupIncludes;
const userIncludes = require('./get_moderation_items.cjs').userIncludes;

const recountCommunity = require('../../../utils/recount_utils.cjs').recountCommunity;
const recountPosts = require('../../../utils/recount_utils.cjs').recountPosts;

const createPointActivity = (point, callback) => {
  models.AcActivity.createActivity({
    type: 'activity.point.new',
    userId: point.user_id,
    groupId: point.group_id,
    postId: point.post_id,
    pointId: point.id,
    access: models.AcActivity.ACCESS_PUBLIC
  }, callback);
};

const publishApprovedPostPoint = (req, point, callback) => {
  models.Post.findOne({ where: { id: point.post_id } }).then((post) => {
    if (!post) {
      callback(new Error('Post not found for approved point'));
      return;
    }
    post.updateAllExternalCounters(req, 'up', 'counter_points', (error) => {
      if (error) {
        callback(error);
      } else {
        post.increment('counter_points').then(() => {
          callback();
        }).catch(callback);
      }
    });
  }).catch(callback);
};

const moderationItemActionMaster = (req, res, options) => {
  getAnonymousUser((error, anonymousUser) => {
    if (error) {
      log.error("Error in getAnonymousUser in moderationItemsActionMaster", {error});
      res.sendStatus(500)
    } else {
      options.model.unscoped().findOne({
        where: {
          deleted: false,
          id: options.itemId
        },
        include: options.includes
      }).then(item => {
        if (item) {
          const queuedPostPoint = options.itemType === 'point' &&
            options.actionType === 'approve' &&
            item.status === 'in_moderation_queue' &&
            item.content_type === models.Point.CONTENT_DEBATE &&
            !item.parent_point_id &&
            item.post_id;
          if (options.actionType==='delete') {
            item.deleted = true;
          } else if (options.actionType==='approve') {
            if (!queuedPostPoint) {
              item.status = 'published';
            }
          } else if (options.actionType==='block') {
            item.status = 'blocked';
          } else if (options.actionType==='anonymize') {
            item.user_id = anonymousUser.id;
          } else if (options.actionType==='clearFlags') {
            item.counter_flags = 0;
          }
          const finishAction = (publishError) => {
              if (publishError) {
                log.error('Error publishing approved point', { error: publishError, pointId: item.id });
                res.sendStatus(500);
                return;
              }
              log.info('Moderation Action Done', { item, options });
              if (options.itemType==='point') {
                if (options.actionType==='anonymize') {
                  queue.add('process-anonymization', { type: 'anonymize-point-activities', pointId: options.itemId }, 'high');
                } else if (options.actionType==='delete') {
                  queue.add('process-deletion', { type: 'delete-point-activities', pointId: options.itemId }, 'high');
                }
                queue.add('process-similarities', { type: 'update-collection', pointId: options.itemId }, 'low', { delay: 5000});
              } else if (options.itemType==='post') {
                if (options.actionType==='anonymize') {
                  queue.add('process-anonymization', { type: 'anonymize-post-activities', pointId: options.itemId }, 'high');
                } else if (options.actionType==='delete') {
                  queue.add('process-deletion', { type: 'delete-post-activities', postId: options.itemId }, 'high');
                }
                queue.add('process-similarities', { type: 'update-collection', postId: options.itemId }, 'low', { delay: 5000 });
              }
              res.sendStatus(200);
          };
          const saveItem = () => {
            item.save().then(() => {
              if (queuedPostPoint) {
                publishApprovedPostPoint(req, item, finishAction);
              } else {
                finishAction();
              }
            }).catch((error) => {
              log.error("Error saving moderated item", { error });
              res.sendStatus(500);
            });
          };
          if (queuedPostPoint) {
            createPointActivity(item, (activityError) => {
              if (activityError) {
                log.error('Error queueing activity for approved point', { error: activityError, pointId: item.id });
                res.sendStatus(500);
                return;
              }
              item.status = 'published';
              saveItem();
            });
          } else {
            saveItem();
          }
        } else {
          log.error("Can't find item", { options });
          res.sendStatus(404);
        }
      }).catch(error => {
        log.error("Error deleting moderated item", { error });
        res.sendStatus(500);
      })
    }
  });
};

const createActivityJob = (workPackage, model) => {
  if (workPackage.itemType==='post') {
    if (workPackage.actionType==='anonymize') {
      queue.add('process-anonymization', { type: 'anonymize-post-activities', postId: model.id }, 'high');
    } else if (workPackage.actionType==='delete') {
      queue.add('process-deletion', { type: 'delete-post-activities', postId: model.id }, 'high');
    }
  } else if (workPackage.itemType==='point') {
    if (workPackage.actionType==='anonymize') {
      queue.add('process-anonymization', { type: 'anonymize-point-activities', pointId: model.id }, 'high');
    } else if (workPackage.actionType==='delete') {
      queue.add('process-deletion', { type: 'delete-point-activities', pointId: model.id }, 'high');
    }
  }
};

const preProcessActivities = (workPackage, callback) => {
  async.forEachLimit(workPackage.itemIds, 20, (id, forEachCallback) => {
    workPackage.model.unscoped().findOne(
      {
        where: {
          id: id
        },
        include: workPackage.includes
      }).then((model) => {
      if (model) {
        createActivityJob(workPackage, model);
        forEachCallback();
      } else {
        log.error("Trying to change activities on an unknown item");
        forEachCallback();
      }
    }).catch(error => {
      forEachCallback(error);
    });
  }, error => {
    callback(error);
  })
};

const moderationManyItemsActionMaster = (workPackage, callback) => {
  getAnonymousUser((error, anonymousUser) => {
    if (error) {
      log.error("Error in getAnonymousUser in moderationItemsActionMaster", {error});
      callback(error);
    } else {
      let updateValues;
      if (workPackage.actionType==='delete') {
        updateValues = {
          deleted: true
        };
      } else if (workPackage.actionType==='approve') {
        updateValues = {
          status: 'published'
        };
      } else if (workPackage.actionType==='block') {
        updateValues = {
          status: 'blocked'
        };
      } else if (workPackage.actionType==='anonymize') {
        updateValues = {
          user_id: anonymousUser.id
        };
      } else if (workPackage.actionType==='clearFlags') {
        updateValues = {
          counter_flags: 0
        };
      }
      if (updateValues) {
        const applyUpdates = (queuedPostPoints = []) => {
          workPackage.approvedPostPointIds = queuedPostPoints.map((point) => point.id);
          preProcessActivities(workPackage, (error) => {
            if (error) {
              callback(error);
            } else {
              async.each(queuedPostPoints, createPointActivity, (activityError) => {
                if (activityError) {
                  callback(activityError);
                  return;
                }
                workPackage.model.unscoped().update(updateValues, {
                  where: {
                    deleted: false,
                    id: { $in: workPackage.itemIds }
                  },
                  include: workPackage.includes
                }).then((spread) => {
                  log.info('Moderation Action Many', { spread, workPackage });
                  callback();
                }).catch(callback);
              });
            }
          });
        };

        if (workPackage.actionType === 'approve' && workPackage.itemType === 'point') {
          models.Point.unscoped().findAll({
            where: {
              id: { [models.Sequelize.Op.in]: workPackage.itemIds },
              status: 'in_moderation_queue',
              content_type: models.Point.CONTENT_DEBATE,
              parent_point_id: null,
              post_id: { [models.Sequelize.Op.ne]: null }
            },
            attributes: ['id', 'group_id', 'post_id', 'user_id']
          }).then((points) => {
            applyUpdates(points);
          }).catch(callback);
        } else {
          applyUpdates();
        }
      } else {
        callback("Couldn't find update values")
      }
    }
  });
};

const performSingleModerationAction = (req, res, options) => {
  let includes, model;

  if (options.domainId) {
    includes = domainIncludes(options.domainId);
  } else if (options.communityId) {
    includes = communityIncludes(options.communityId);
  } else if (options.groupId) {
    includes = groupIncludes(options.groupId);
  } else if (options.userId) {
    includes =  userIncludes(options.userId);
  }  else {
    log.error("Missing model type", { options });
    res.sendStatus(500);
    return;
  }

  if (options.userId && (options.actionType!=='delete' && options.actionType!=='anonymize')) {
    log.error("Trying to call forbidden actions for user", { options });
    res.sendStatus(500);
    return;
  }

  if (options.itemType==='post') {
    model = models.Post;
  } else if (options.itemType==='point') {
    model = models.Point;
  }

  moderationItemActionMaster(req, res, { itemType: options.itemType, itemId: options.itemId, model, actionType: options.actionType, includes });


};

const performManyModerationActions = async (workPackage, callback) => {
  const postItems = _.filter(workPackage.items, (item) => {
    return item.modelType === 'post';
  });

  const postIds = _.map(postItems, item => {
    return item.id
  });

  const pointItems = _.filter(workPackage.items, (item) => {
    return item.modelType === 'point';
  });

  let pointIds = _.map(pointItems, item => {
    return item.id
  });

  let includes;

  if (workPackage.domainId) {
    includes = domainIncludes(workPackage.domainId);
  } else if (workPackage.communityId) {
    includes = communityIncludes(workPackage.communityId);
  } else if (workPackage.groupId) {
    includes = groupIncludes(workPackage.groupId);
  } else if (workPackage.userId) {
    includes = userIncludes(workPackage.userId);
  }  else {
    callback("Wrong action parameters", workPackage);
    return;
  }

  //TODO: Also do this for singleModerationAction and refactor
  if (postIds && postIds.length>0) {
    try {
      const posts = await models.Post.findAll({
        where: {
          id: {
            [models.Sequelize.Op.in]: postIds
          }
        },
        attributes: ['id'],
        include: [
          {
            model: models.Point,
            required: true,
            attributes: ['id']
          }
        ]
      });

      if (posts) {
        const morePointsIds = [];
        for (let p=0;p<posts.length;p++) {
          for (let n=0;n<posts[p].Points.length;n++) {
            morePointsIds.push(posts[p].Points[n].id);
          }
        }

        pointIds = [...pointIds, ...morePointsIds]
      }
    } catch (error) {
      log.error();
    }
  }

  const pointWorkPackage = _.cloneDeep(workPackage);
  const postWorkPackage = _.cloneDeep(workPackage);

  async.parallel([
    parallelCallback => {
      if (postIds && postIds.length>0) {
        moderationManyItemsActionMaster(_.merge(postWorkPackage, { itemType: 'post', model: models.Post, includes, itemIds: postIds }), parallelCallback);
      } else {
        parallelCallback();
      }
    },
    parallelCallback => {
      if (pointIds && pointIds.length>0) {
        moderationManyItemsActionMaster(_.merge(pointWorkPackage, { itemType: 'point', model: models.Point, includes, itemIds: pointIds }), parallelCallback);
      } else {
        parallelCallback();
      }
    }
    ], async error => {
      if (!error) {
        if (pointIds.length>0) {
          _.map(pointIds, (pointId) => {
            queue.add('process-similarities', { type: 'update-collection', pointId: pointId }, 'low', { delay: 5000 });
          });
        }
        if (postIds.length>0) {
          _.map(postIds, (postId) => {
            queue.add('process-similarities', { type: 'update-collection', postId: postId }, 'low', { delay: 5000 });
          });
        }
        const finishRecount = () => {
          if (postIds.length > 0 || pointIds.length > 0) {
            if (workPackage.groupId) {
              models.Group.findOne({
                where: {
                  id: workPackage.groupId
                },
                attributes: ['id', 'community_id']
              }).then(group => {
                if (group) {
                  recountCommunity(group.community_id, callback);
                } else {
                  callback("Can't find group for recount");
                }
              });
            } else if (workPackage.communityId) {
              recountCommunity(workPackage.communityId, callback);
            } else {
              callback();
            }
          } else {
            callback();
          }
        };

        const approvedPostPointIds = pointWorkPackage.approvedPostPointIds || [];
        if (approvedPostPointIds.length > 0) {
          models.Point.unscoped().findAll({
            where: {
              id: { [models.Sequelize.Op.in]: approvedPostPointIds }
            },
            attributes: ['post_id']
          }).then((points) => {
            const affectedPostIds = _.uniq(points.map((point) => point.post_id).filter(Boolean));
            recountPosts(affectedPostIds, finishRecount);
          }).catch(callback);
        } else {
          finishRecount();
        }
      } else {
        callback(error);
      }
    }
  );
};

module.exports = {
  performSingleModerationAction,
  performManyModerationActions
};