const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PersonalTask = sequelize.define('PersonalTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('todo', 'in-progress', 'completed', 'on-hold', 'cancelled'),
    defaultValue: 'todo'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'If null, it\'s a standalone task'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedTime: {
    type: DataTypes.INTEGER, // Time in minutes
    allowNull: true
  },
  actualTime: {
    type: DataTypes.INTEGER, // Time in minutes
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = PersonalTask;