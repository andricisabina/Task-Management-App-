'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Comments', 'projectId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ProfessionalProjects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.changeColumn('Comments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Comments', 'projectId');
    await queryInterface.changeColumn('Comments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
