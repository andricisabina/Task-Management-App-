const { PersonalTask, ProfessionalTask, User, Department, PersonalProject, ProfessionalProject, ProjectMember } = require('../models');
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

    // Build base query with proper date filtering
    const whereClause = {};
    if (startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      whereClause.createdAt = { 
        ...whereClause.createdAt,
        [Op.lte]: new Date(endDate) 
      };
    }

    let tasks;
    let insights = {};

    // Fetch data based on scope
    switch (scope) {
      case 'personal_tasks':
        // Get all personal tasks for the current user
        tasks = await PersonalTask.findAll({
          where: { 
            ...whereClause, 
            userId: req.user.id 
          },
          include: [
            { 
              model: User, 
              attributes: ['name', 'email'] 
            },
            {
              model: PersonalProject,
              attributes: ['title', 'description'],
              required: false // LEFT JOIN to include tasks without projects
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        // Calculate KPIs
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const overdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          return new Date(t.dueDate) < new Date();
        });

        const kpis = {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length * 100) : 0,
          overdueCount: overdueTasks.length,
          averageDuration: 0
        };

        // Calculate average duration for completed tasks
        const completedWithDuration = completedTasks.filter(t => t.completedAt && t.createdAt);
        if (completedWithDuration.length > 0) {
          const totalDuration = completedWithDuration.reduce((acc, t) => {
            return acc + (new Date(t.completedAt) - new Date(t.createdAt));
          }, 0);
          kpis.averageDuration = totalDuration / completedWithDuration.length / (1000 * 60 * 60 * 24); // Convert to days
        }

        // Status distribution chart
        const statusCounts = {
          'todo': tasks.filter(t => t.status === 'todo').length,
          'in-progress': tasks.filter(t => t.status === 'in-progress').length,
          'completed': completedTasks.length,
          'on-hold': tasks.filter(t => t.status === 'on-hold').length,
          'cancelled': tasks.filter(t => t.status === 'cancelled').length
        };

        const statusDistribution = {
          labels: Object.keys(statusCounts).map(status => status.replace('-', ' ').toUpperCase()),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#FFC107', '#2196F3', '#4CAF50', '#FF9800', '#F44336']
          }]
        };

        // Priority distribution
        const priorityCounts = {
          'low': tasks.filter(t => t.priority === 'low').length,
          'medium': tasks.filter(t => t.priority === 'medium').length,
          'high': tasks.filter(t => t.priority === 'high').length,
          'urgent': tasks.filter(t => t.priority === 'urgent').length
        };

        const priorityDistribution = {
          labels: Object.keys(priorityCounts).map(p => p.toUpperCase()),
          datasets: [{
            label: 'Tasks by Priority',
            data: Object.values(priorityCounts),
            backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336']
          }]
        };

        // Tasks per project (for tasks that belong to projects)
        const projectTasks = tasks.filter(t => t.projectId);
        const projectCounts = {};
        projectTasks.forEach(task => {
          const projectName = task.PersonalProject?.title || 'Unknown Project';
          projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
        });

        const projectDistribution = {
          labels: Object.keys(projectCounts),
          datasets: [{
            label: 'Tasks per Project',
            data: Object.values(projectCounts),
            backgroundColor: '#2196F3'
          }]
        };

        if (format === 'json') {
          return res.json({
            type: 'personal_tasks',
            kpis,
            charts: {
              statusDistribution,
              priorityDistribution,
              projectDistribution
            },
            insights: {
              totalTasks: kpis.totalTasks,
              completedTasks: kpis.completedTasks,
              overdueCount: kpis.overdueCount,
              completionRate: kpis.completionRate,
              averageDuration: kpis.averageDuration
            },
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              project: task.PersonalProject?.title || null,
              createdAt: task.createdAt
            }))
          });
        }
        break;

      case 'personal_project':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required for personal project reports' });
        }

        // Verify user owns this project
        const project = await PersonalProject.findOne({
          where: { id: projectId, userId: req.user.id }
        });

        if (!project) {
          return res.status(404).json({ error: 'Project not found or access denied' });
        }

        tasks = await PersonalTask.findAll({
          where: { 
            ...whereClause, 
            projectId: projectId 
          },
          include: [
            { 
              model: User, 
              attributes: ['name', 'email'] 
            },
            {
              model: PersonalProject,
              attributes: ['title', 'description']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        const projectCompletedTasks = tasks.filter(t => t.status === 'completed');
        const projectOverdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          return new Date(t.dueDate) < new Date();
        });

        const projectKpis = {
          totalTasks: tasks.length,
          completedTasks: projectCompletedTasks.length,
          completionRate: tasks.length > 0 ? (projectCompletedTasks.length / tasks.length * 100) : 0,
          overdueCount: projectOverdueTasks.length,
          projectTitle: project.title,
          projectCompleted: tasks.length > 0 && tasks.every(t => t.status === 'completed')
        };

        // Project status distribution
        const projectStatusCounts = {
          'todo': tasks.filter(t => t.status === 'todo').length,
          'in-progress': tasks.filter(t => t.status === 'in-progress').length,
          'completed': projectCompletedTasks.length,
          'on-hold': tasks.filter(t => t.status === 'on-hold').length,
          'cancelled': tasks.filter(t => t.status === 'cancelled').length
        };

        const projectStatusDistribution = {
          labels: Object.keys(projectStatusCounts).map(status => status.replace('-', ' ').toUpperCase()),
          datasets: [{
            data: Object.values(projectStatusCounts),
            backgroundColor: ['#FFC107', '#2196F3', '#4CAF50', '#FF9800', '#F44336']
          }]
        };

        if (format === 'json') {
          return res.json({
            type: 'personal_project',
            kpis: projectKpis,
            charts: {
              statusDistribution: projectStatusDistribution
            },
            insights: {
              totalTasks: projectKpis.totalTasks,
              completedTasks: projectKpis.completedTasks,
              overdueCount: projectKpis.overdueCount,
              completionRate: projectKpis.completionRate,
              projectCompleted: projectKpis.projectCompleted
            },
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              createdAt: task.createdAt
            }))
          });
        }
        break;

      case 'professional_project':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required for professional project reports' });
        }

        // Check if user has access to this project
        const projectMember = await ProjectMember.findOne({
          where: { 
            projectId: projectId, 
            userId: req.user.id,
            status: 'accepted'
          }
        });

        if (!projectMember && !['admin', 'project_manager'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Access denied to this project' });
        }

        tasks = await ProfessionalTask.findAll({
          where: { 
            ...whereClause, 
            projectId: projectId 
          },
          include: [
            { 
              model: User, 
              as: 'assignedTo',
              attributes: ['name', 'email'] 
            },
            {
              model: ProfessionalProject,
              attributes: ['title', 'description']
            },
            {
              model: Department,
              attributes: ['name', 'color']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        const teamCompletedTasks = tasks.filter(t => t.status === 'completed');
        const teamOverdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          return new Date(t.dueDate) < new Date();
        });

        const teamKpis = {
          totalTasks: tasks.length,
          completedTasks: teamCompletedTasks.length,
          completionRate: tasks.length > 0 ? (teamCompletedTasks.length / tasks.length * 100) : 0,
          overdueCount: teamOverdueTasks.length,
          rejectedTasks: tasks.filter(t => t.status === 'rejected').length,
          teamMembers: new Set(tasks.map(t => t.assignedToId).filter(Boolean)).size
        };

        // Team status distribution
        const teamStatusCounts = {
          'pending': tasks.filter(t => t.status === 'pending').length,
          'todo': tasks.filter(t => t.status === 'todo').length,
          'in-progress': tasks.filter(t => t.status === 'in-progress').length,
          'review': tasks.filter(t => t.status === 'review').length,
          'completed': teamCompletedTasks.length,
          'rejected': tasks.filter(t => t.status === 'rejected').length,
          'on-hold': tasks.filter(t => t.status === 'on-hold').length,
          'cancelled': tasks.filter(t => t.status === 'cancelled').length
        };

        const teamStatusDistribution = {
          labels: Object.keys(teamStatusCounts).map(status => status.replace('-', ' ').toUpperCase()),
          datasets: [{
            data: Object.values(teamStatusCounts),
            backgroundColor: ['#9E9E9E', '#FFC107', '#2196F3', '#FF9800', '#4CAF50', '#F44336', '#795548', '#607D8B']
          }]
        };

        // Tasks per department
        const departmentCounts = {};
        tasks.forEach(task => {
          const deptName = task.Department?.name || 'No Department';
          departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
        });

        const departmentDistribution = {
          labels: Object.keys(departmentCounts),
          datasets: [{
            label: 'Tasks per Department',
            data: Object.values(departmentCounts),
            backgroundColor: '#2196F3'
          }]
        };

        // Tasks per user
        const userCounts = {};
        tasks.forEach(task => {
          const userName = task.assignedTo?.name || 'Unassigned';
          userCounts[userName] = (userCounts[userName] || 0) + 1;
        });

        const userDistribution = {
          labels: Object.keys(userCounts),
          datasets: [{
            label: 'Tasks per User',
            data: Object.values(userCounts),
            backgroundColor: '#FF9800'
          }]
        };

        if (format === 'json') {
          return res.json({
            type: 'professional_project',
            kpis: teamKpis,
            charts: {
              statusDistribution: teamStatusDistribution,
              departmentDistribution,
              userDistribution
            },
            insights: {
              totalTasks: teamKpis.totalTasks,
              completedTasks: teamKpis.completedTasks,
              overdueCount: teamKpis.overdueCount,
              completionRate: teamKpis.completionRate,
              rejectedTasks: teamKpis.rejectedTasks,
              teamMembers: teamKpis.teamMembers
            },
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              department: task.Department?.name || 'No Department',
              createdAt: task.createdAt
            }))
          });
        }
        break;

      case 'all_professional':
        // Only admins and project managers can see all professional projects
        if (!['admin', 'project_manager'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Unauthorized to view all professional projects' });
        }

        tasks = await ProfessionalTask.findAll({
          where: whereClause,
          include: [
            { 
              model: User, 
              as: 'assignedTo',
              attributes: ['name', 'email'] 
            },
            {
              model: ProfessionalProject,
              attributes: ['title', 'description']
            },
            {
              model: Department,
              attributes: ['name', 'color']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        const allCompletedTasks = tasks.filter(t => t.status === 'completed');
        const allOverdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          return new Date(t.dueDate) < new Date();
        });

        const allKpis = {
          totalTasks: tasks.length,
          completedTasks: allCompletedTasks.length,
          completionRate: tasks.length > 0 ? (allCompletedTasks.length / tasks.length * 100) : 0,
          overdueCount: allOverdueTasks.length,
          rejectedTasks: tasks.filter(t => t.status === 'rejected').length,
          totalProjects: new Set(tasks.map(t => t.projectId)).size,
          totalUsers: new Set(tasks.map(t => t.assignedToId).filter(Boolean)).size
        };

        // Overall status distribution
        const allStatusCounts = {
          'pending': tasks.filter(t => t.status === 'pending').length,
          'todo': tasks.filter(t => t.status === 'todo').length,
          'in-progress': tasks.filter(t => t.status === 'in-progress').length,
          'review': tasks.filter(t => t.status === 'review').length,
          'completed': allCompletedTasks.length,
          'rejected': tasks.filter(t => t.status === 'rejected').length,
          'on-hold': tasks.filter(t => t.status === 'on-hold').length,
          'cancelled': tasks.filter(t => t.status === 'cancelled').length
        };

        const allStatusDistribution = {
          labels: Object.keys(allStatusCounts).map(status => status.replace('-', ' ').toUpperCase()),
          datasets: [{
            data: Object.values(allStatusCounts),
            backgroundColor: ['#9E9E9E', '#FFC107', '#2196F3', '#FF9800', '#4CAF50', '#F44336', '#795548', '#607D8B']
          }]
        };

        if (format === 'json') {
          return res.json({
            type: 'all_professional',
            kpis: allKpis,
            charts: {
              statusDistribution: allStatusDistribution
            },
            insights: {
              totalTasks: allKpis.totalTasks,
              completedTasks: allKpis.completedTasks,
              overdueCount: allKpis.overdueCount,
              completionRate: allKpis.completionRate,
              rejectedTasks: allKpis.rejectedTasks,
              totalProjects: allKpis.totalProjects,
              totalUsers: allKpis.totalUsers
            },
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              department: task.Department?.name || 'No Department',
              project: task.ProfessionalProject?.title || 'Unknown Project',
              createdAt: task.createdAt
            }))
          });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid report scope' });
    }

    // For CSV and Excel exports, use the calculated insights
    const exportInsights = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      overdueCount: tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate) < new Date();
      }).length,
      completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100) : 0
    };

    // Generate report based on format
    if (format === 'csv') {
      const csvContent = generateCSV({ tasks, insights: exportInsights, scope });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${scope}-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvContent);
    } else if (format === 'excel') {
      const excelBuffer = await generateExcel({ tasks, insights: exportInsights, scope });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${scope}-${new Date().toISOString().split('T')[0]}.xlsx`);
      return res.send(excelBuffer);
    } else {
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