'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Departments', 'color', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#6c757d'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Departments', 'color');
  }
}; 