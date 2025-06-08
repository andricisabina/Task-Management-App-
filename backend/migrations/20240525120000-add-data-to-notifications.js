// Migration to add 'data' column to Notifications table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Notifications', 'data', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Extra data for notification (e.g., extension days/reason)'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Notifications', 'data');
  }
}; 