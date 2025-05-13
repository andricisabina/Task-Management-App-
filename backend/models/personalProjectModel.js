const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PersonalProject = sequelize.define('PersonalProject', {
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
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('planning', 'in-progress', 'completed', 'on-hold', 'cancelled'),
    defaultValue: 'planning'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#6c757d' // Default gray color
  }
});

module.exports = PersonalProject;