const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ProfessionalTask = sequelize.define('ProfessionalTask', {
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
    type: DataTypes.ENUM('pending', 'in-progress', 'review', 'completed', 'rejected', 'deadline-extension-requested'),
    defaultValue: 'pending'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  originalDueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  assignedById: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  extensionRequestReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  extensionRequestDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  extensionStatus: {
    type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected'),
    defaultValue: 'none'
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = ProfessionalTask;