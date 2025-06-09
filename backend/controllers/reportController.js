const { PersonalTask, ProfessionalTask, User, Project, Department, PersonalProject, ProfessionalProject } = require('../models');
const { generateCSV } = require('../utils/generateReportCSV');
const { generateExcel } = require('../utils/generateReportExcel');
const { Op } = require('sequelize');

const getReportData = async (req, res) => {
  try {
    const {
      scope,
      projectId,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    // Build base query
    const whereClause = {};
    if (startDate) whereClause.dueDate = { [Op.gte]: startDate };
    if (endDate) whereClause.dueDate = { [Op.lte]: endDate };

    let tasks;
    let insights = {};

    // Fetch data based on scope
    switch (scope) {
      case 'personal_tasks':
        tasks = await PersonalTask.findAll({
          where: { ...whereClause, userId: req.user.id },
          include: [{ model: User, attributes: ['name'] }]
        });
        break;

      case 'personal_project':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required for personal project reports' });
        }
        tasks = await PersonalTask.findAll({
          where: { ...whereClause, projectId },
          include: [
            { model: User, attributes: ['name'] },
            { model: PersonalProject, attributes: ['title'] }
          ]
        });
        break;

      case 'professional_project':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required for professional project reports' });
        }
        tasks = await ProfessionalTask.findAll({
          where: { ...whereClause, projectId },
          include: [
            { model: User, as: 'assignedTo', attributes: ['name'] },
            { 
              model: ProfessionalProject, 
              attributes: ['title'],
              include: [
                { model: Department, as: 'departments', attributes: ['name'], through: { attributes: [] } }
              ]
            }
          ]
        });
        break;

      case 'all_professional':
        if (!['admin', 'project_manager'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Unauthorized to view all professional projects' });
        }
        tasks = await ProfessionalTask.findAll({
          where: whereClause,
          include: [
            { model: User, as: 'assignedTo', attributes: ['name'] },
            { model: Project, attributes: ['name'] },
            { model: Department, attributes: ['name'] }
          ]
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid report scope' });
    }

    // Calculate insights
    const completedTasksArr = tasks.filter(t => t.status === 'completed' && t.completedAt && t.startDate);
    insights = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      overdueCount: tasks.filter(t => {
        const isOverdue = new Date(t.dueDate) < new Date();
        return t.status !== 'completed' && isOverdue;
      }).length,
      completionRate: (tasks.filter(t => t.status === 'completed').length / tasks.length * 100) || 0,
      averageDuration: completedTasksArr.length
        ? completedTasksArr.reduce((acc, t) => acc + (new Date(t.completedAt) - new Date(t.startDate)), 0) / completedTasksArr.length
        : 0
    };

    // Add department performance for professional reports
    if (scope === 'professional_project' || scope === 'all_professional') {
      const departmentTasks = tasks.reduce((acc, task) => {
        const deptName = task.Department?.name || 'No Department';
        if (!acc[deptName]) {
          acc[deptName] = { total: 0, completed: 0 };
        }
        acc[deptName].total++;
        if (task.status === 'completed') acc[deptName].completed++;
        return acc;
      }, {});

      const userActivity = tasks.reduce((acc, task) => {
        const userName = task.assignedTo?.name || 'Unassigned';
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {});

      insights.departmentPerformance = {
        departments: Object.entries(departmentTasks).map(([name, data]) => ({
          name,
          completionRate: (data.completed / data.total * 100) || 0
        })),
        mostActiveUser: Object.entries(userActivity)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
      };
    }

    // Generate report based on format
    switch (format) {
      case 'csv':
        const csvBuffer = await generateCSV({ tasks, insights, scope });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="productivity-report-${scope}.csv"`);
        return res.send(csvBuffer);

      case 'excel':
        const excelBuffer = await generateExcel({ tasks, insights, scope });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="productivity-report-${scope}.xlsx"`);
        return res.send(excelBuffer);

      case 'json':
        return res.json({ tasks, insights });

      default:
        return res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = {
  getReportData
}; 