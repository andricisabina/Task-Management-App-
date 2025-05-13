const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ProfessionalProject = sequelize.define('ProfessionalProject', {
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
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('planning', 'in-progress', 'completed', 'on-hold', 'cancelled'),
    defaultValue: 'planning'
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  completionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#007bff' // Default blue color
  }
});

module.exports = ProfessionalProject;