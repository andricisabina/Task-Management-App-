const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('task_assigned', 'task_updated', 'deadline_approaching', 'task_completed', 'comment_added', 'extension_requested', 'extension_response', 'project_update', 'system', 'leader_invitation'),
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  relatedId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of related entity (task, project, etc.)'
  },
  relatedType: {
    type: DataTypes.ENUM('personal_task', 'professional_task', 'personal_project', 'professional_project', 'comment'),
    allowNull: true
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Frontend link to navigate to related entity'
  }
});

module.exports = Notification;