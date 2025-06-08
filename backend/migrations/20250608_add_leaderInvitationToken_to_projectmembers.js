module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ProjectMembers', 'leaderInvitationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ProjectMembers', 'leaderInvitationToken');
  }
}; 