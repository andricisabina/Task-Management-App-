const sequelize = require('../config/sequelize');
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

ProfessionalProject.hasMany(ProfessionalTask, { foreignKey: 'projectId', as: 'ProfessionalTasks' });
ProfessionalTask.belongsTo(ProfessionalProject, { foreignKey: 'projectId' });

ProfessionalProject.hasMany(Comment, { foreignKey: 'projectId' });
Comment.belongsTo(ProfessionalProject, { foreignKey: 'projectId' });

// Task relationships
ProfessionalTask.hasMany(Comment, { foreignKey: 'taskId' });
Comment.belongsTo(ProfessionalTask, { foreignKey: 'taskId' });

ProfessionalTask.hasMany(Attachment, { foreignKey: 'taskId' });
Attachment.belongsTo(ProfessionalTask, { foreignKey: 'taskId' });

// Many-to-many relationship between Users and ProfessionalProjects
const ProjectMember = sequelize.define('ProjectMember', {
  departmentId: {
    type: sequelize.Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'Departments', key: 'id' }
  },
  role: {
    type: sequelize.Sequelize.ENUM('manager', 'leader', 'member'),
    allowNull: false,
    defaultValue: 'member'
  },
  status: {
    type: sequelize.Sequelize.ENUM('invited', 'accepted', 'declined'),
    allowNull: false,
    defaultValue: 'invited'
  },
  invitedById: {
    type: sequelize.Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  }
}, { 
  timestamps: true,
  tableName: 'ProjectMembers'
});

User.belongsToMany(ProfessionalProject, { 
  through: ProjectMember,
  foreignKey: 'userId',
  otherKey: 'projectId'
});

ProfessionalProject.belongsToMany(User, { 
  through: ProjectMember,
  foreignKey: 'projectId',
  otherKey: 'userId'
});

// Add direct associations for eager loading
ProfessionalProject.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'ProjectMembers' });
ProjectMember.belongsTo(ProfessionalProject, { foreignKey: 'projectId' });

// ProjectMember associations
ProjectMember.belongsTo(Department, { foreignKey: 'departmentId' });
Department.hasMany(ProjectMember, { foreignKey: 'departmentId' });
ProjectMember.belongsTo(User, { as: 'invitedBy', foreignKey: 'invitedById' });
User.hasMany(ProjectMember, { as: 'invitationsSent', foreignKey: 'invitedById' });

// Add association for member user
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'member' });

// Many-to-many relationship between Departments and ProfessionalProjects
const ProjectDepartment = sequelize.define('ProjectDepartment', {
  leaderId: {
    type: sequelize.Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  }
}, { 
  timestamps: true,
  tableName: 'ProjectDepartments'
});

// ProjectDepartment associations
ProjectDepartment.belongsTo(User, { as: 'leader', foreignKey: 'leaderId' });
User.hasMany(ProjectDepartment, { as: 'ledDepartments', foreignKey: 'leaderId' });

Department.belongsToMany(ProfessionalProject, { 
  through: ProjectDepartment,
  foreignKey: 'departmentId',
  otherKey: 'projectId'
});

ProfessionalProject.belongsToMany(Department, { 
  through: ProjectDepartment,
  as: 'departments',
  foreignKey: 'projectId',
  otherKey: 'departmentId'
});

// Add the missing association for Attachment to User as 'uploader' and the reverse association as 'uploadedFiles'
Attachment.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });
User.hasMany(Attachment, { as: 'uploadedFiles', foreignKey: 'uploadedBy' });

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
  ProjectMember,
  ProjectDepartment
};