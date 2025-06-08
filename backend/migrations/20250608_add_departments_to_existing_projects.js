module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For each ProjectMember with role 'leader', ensure a ProjectDepartment link exists
    const [leaders] = await queryInterface.sequelize.query(`
      SELECT DISTINCT projectId, departmentId, userId
      FROM ProjectMembers
      WHERE role = 'leader' AND departmentId IS NOT NULL
    `);
    for (const leader of leaders) {
      // Check if the link already exists
      const [existing] = await queryInterface.sequelize.query(`
        SELECT * FROM ProjectDepartments
        WHERE projectId = ${leader.projectId} AND departmentId = ${leader.departmentId}
      `);
      if (existing.length === 0) {
        // Insert the missing link
        await queryInterface.sequelize.query(`
          INSERT INTO ProjectDepartments (projectId, departmentId, leaderId, createdAt, updatedAt)
          VALUES (${leader.projectId}, ${leader.departmentId}, ${leader.userId}, NOW(), NOW())
        `);
      }
    }
  },
  down: async (queryInterface, Sequelize) => {
    // This migration is not reversible
  }
}; 