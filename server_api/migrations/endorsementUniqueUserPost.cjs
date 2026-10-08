'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('endorsements', ['user_id', 'post_id'], {
      unique: true,
      name: 'endorsements_user_post_unique_active',
      where: {
        deleted: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('endorsements', 'endorsements_user_post_unique_active');
  },
};
