const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ProfessionalProjects',
      key: 'id'
    }
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of parent comment for nested replies'
  }
});

module.exports = Comment;