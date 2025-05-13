const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#6c757d' // Default gray color
  }
});

module.exports = Department;