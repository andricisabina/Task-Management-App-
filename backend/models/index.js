const sequelize = require('../config/database');
const User = require('./userModel');
const Department = require('./departmentModel');
const PersonalProject = require('./personalProjectModel');
const ProfessionalProject = require('./professionalProjectModel');
const PersonalTask = require('./personalTaskModel');
const ProfessionalTask = require('./professionalTaskModel');
const Comment = require('./commentModel');
const Attachment = require('./attachmentModel');
const Notification = require('./notificationModel');

// Define relationships between models
// User relationships
User.hasMany(PersonalProject, { foreignKey: 'userId' });
PersonalProject.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ProfessionalProject, { foreignKey: 'creatorId' });
ProfessionalProject.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });

User.hasMany(PersonalTask, { foreignKey: 'userId' });
PersonalTask.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ProfessionalTask, { foreignKey: 'assignedToId' });
ProfessionalTask.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.belongsTo(Department, { foreignKey: 'departmentId' });
Department.hasMany(User, { foreignKey: 'departmentId' });

// Project relationships
PersonalProject.hasMany(PersonalTask, { foreignKey: 'projectId' });
PersonalTask.belongsTo(PersonalProject, { foreignKey: 'projectId' });

ProfessionalProject.hasMany(ProfessionalTask, { foreignKey: 'projectId' });
ProfessionalTask.belongsTo(ProfessionalProject, { foreignKey: 'projectId' });

// Task relationships
ProfessionalTask.hasMany(Comment, { foreignKey: 'taskId' });
Comment.belongsTo(ProfessionalTask, { foreignKey: 'taskId' });

ProfessionalTask.hasMany(Attachment, { foreignKey: 'taskId' });
Attachment.belongsTo(ProfessionalTask, { foreignKey: 'taskId' });

// Many-to-many relationship between Users and ProfessionalProjects
// through ProjectMembers model (defined virtually here using through)
const ProjectMember = sequelize.define('ProjectMember', {}, { timestamps: true });
User.belongsToMany(ProfessionalProject, { through: ProjectMember, foreignKey: 'userId' });
ProfessionalProject.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId' });

// Department relationship with ProfessionalProjects
Department.hasMany(ProfessionalProject, { foreignKey: 'departmentId' });
ProfessionalProject.belongsTo(Department, { foreignKey: 'departmentId' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Department,
  PersonalProject,
  ProfessionalProject,
  PersonalTask,
  ProfessionalTask,
  Comment,
  Attachment,
  Notification,
  ProjectMember
};