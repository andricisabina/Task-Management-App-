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
        
        // Fix overdue calculation to be consistent with other parts of the system
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
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
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              originalDueDate: task.originalDueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              assignedBy: task.assignedBy?.name || 'Unknown',
              department: task.Department?.name || 'No Department',
              rejectionReason: task.rejectionReason,
              extensionRequestReason: task.extensionRequestReason,
              extensionRequestDays: task.extensionRequestDays,
              extensionStatus: task.extensionStatus,
              color: task.color,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
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
        
        // Fix overdue calculation for personal project tasks
        const projectOverdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
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
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              originalDueDate: task.originalDueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              assignedBy: task.assignedBy?.name || 'Unknown',
              department: task.Department?.name || 'No Department',
              rejectionReason: task.rejectionReason,
              extensionRequestReason: task.extensionRequestReason,
              extensionRequestDays: task.extensionRequestDays,
              extensionStatus: task.extensionStatus,
              color: task.color,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
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

        // Also check if user is the project creator
        const professionalProject = await ProfessionalProject.findOne({
          where: { id: projectId }
        });

        const isCreator = professionalProject && professionalProject.creatorId === req.user.id;
        const isMember = projectMember !== null;
        const isAdmin = ['admin', 'project_manager'].includes(req.user.role);

        if (!isCreator && !isMember && !isAdmin) {
          return res.status(403).json({ error: 'Access denied to this project' });
        }

        tasks = await ProfessionalTask.findAll({
          where: { 
            projectId: projectId 
          },
          include: [
            { 
              model: User, 
              as: 'assignedTo',
              attributes: ['name', 'email'] 
            },
            {
              model: User,
              as: 'assignedBy',
              attributes: ['name', 'email']
            },
            {
              model: ProfessionalProject,
              attributes: ['title', 'description', 'status', 'startDate', 'dueDate', 'completionRate', 'priority']
            },
            {
              model: Department,
              attributes: ['name', 'color']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        // Apply date filtering after fetching to not interfere with overdue calculations
        if (startDate || endDate) {
          tasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            if (startDate && taskDate < new Date(startDate)) return false;
            if (endDate && taskDate > new Date(endDate)) return false;
            return true;
          });
        }

        const teamCompletedTasks = tasks.filter(t => t.status === 'completed');
        const teamOverdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed' || t.status === 'rejected') return false;
          const dueDate = new Date(t.dueDate);
          const now = new Date();
          // Reset time to compare only dates
          dueDate.setHours(0, 0, 0, 0);
          now.setHours(0, 0, 0, 0);
          return dueDate < now;
        });

        // Calculate additional metrics
        const tasksWithExtensions = tasks.filter(t => t.extensionStatus !== 'none');
        const tasksInReview = tasks.filter(t => t.status === 'review');
        const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');

        // To calculate the project's true completion rate, we need all its tasks, not just filtered ones.
        const allProjectTasks = await ProfessionalTask.findAll({ 
          where: { projectId: projectId },
          include: [
            { model: User, as: 'assignedTo', attributes: ['id', 'name'], required: false },
            { model: Department, attributes: ['id', 'name'], required: false }
          ]
        });
        const completedProjectTasks = allProjectTasks.filter(t => t.status === 'completed');
        const calculatedProjectCompletionRate = allProjectTasks.length > 0 
          ? (completedProjectTasks.length / allProjectTasks.length * 100) 
          : 0;

        const teamKpis = {
          totalTasks: tasks.length,
          completedTasks: teamCompletedTasks.length,
          completionRate: tasks.length > 0 ? parseFloat((teamCompletedTasks.length / tasks.length * 100).toFixed(1)) : 0,
          overdueCount: teamOverdueTasks.length,
          rejectedTasks: tasks.filter(t => t.status === 'rejected').length,
          teamMembers: new Set(tasks.map(t => t.assignedToId).filter(Boolean)).size,
          tasksInReview: tasksInReview.length,
          extensionRequests: tasksWithExtensions.length,
          highPriorityTasks: highPriorityTasks.length,
          projectCompletionRate: parseFloat(calculatedProjectCompletionRate.toFixed(1)),
          projectStatus: professionalProject?.status || 'unknown'
        };

        console.log('Professional Project Report Debug:', {
          projectId,
          totalTasks: tasks.length,
          completedTasks: teamCompletedTasks.length,
          overdueTasks: teamOverdueTasks.length,
          projectCompletionRate: professionalProject?.completionRate,
          projectStatus: professionalProject?.status,
          teamKpis,
          sampleTasks: tasks.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate,
            isOverdue: !t.dueDate || t.status === 'completed' ? false : new Date(t.dueDate) < new Date()
          }))
        });

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

        // Priority distribution
        const teamPriorityCounts = {
          'low': tasks.filter(t => t.priority === 'low').length,
          'medium': tasks.filter(t => t.priority === 'medium').length,
          'high': tasks.filter(t => t.priority === 'high').length,
          'urgent': tasks.filter(t => t.priority === 'urgent').length
        };

        const teamPriorityDistribution = {
          labels: Object.keys(teamPriorityCounts).map(p => p.toUpperCase()),
          datasets: [{
            label: 'Tasks by Priority',
            data: Object.values(teamPriorityCounts),
            backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336']
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

        // --- Performance Highlights Calculations ---

        // Use tasks with recorded actual and estimated time for productivity measurement
        const completedTasksForProductivity = allProjectTasks.filter(
          t => t.status === 'completed' && t.actualTime > 0 && t.estimatedTime > 0
        );

        // Department Productivity (Efficiency Ratio)
        const departmentProductivity = {};
        completedTasksForProductivity.forEach(task => {
          if (!task.departmentId || !task.Department) return;
          const efficiencyRatio = task.actualTime / task.estimatedTime;
          if (!departmentProductivity[task.departmentId]) {
            departmentProductivity[task.departmentId] = { totalRatio: 0, count: 0, name: task.Department.name };
          }
          departmentProductivity[task.departmentId].totalRatio += efficiencyRatio;
          departmentProductivity[task.departmentId].count++;
        });
        
        let mostProductiveDepartment = null;
        if (Object.keys(departmentProductivity).length > 0) {
          let minDeptAvgRatio = Infinity;
          for (const deptId in departmentProductivity) {
            const dept = departmentProductivity[deptId];
            const avgRatio = dept.totalRatio / dept.count;
            if (avgRatio < minDeptAvgRatio) {
              minDeptAvgRatio = avgRatio;
              mostProductiveDepartment = {
                name: dept.name,
                avgEfficiencyRatio: parseFloat(avgRatio.toFixed(2))
              };
            }
          }
        }

        // User Productivity (Efficiency Ratio) & Task Counts
        const userProductivity = {};
        const userTaskCounts = {};
        const userRejectionCounts = {};

        allProjectTasks.forEach(task => {
          if (!task.assignedToId || !task.assignedTo) return;
          const userId = task.assignedToId;
          const userName = task.assignedTo.name;

          if (!userTaskCounts[userId]) userTaskCounts[userId] = { count: 0, name: userName };
          userTaskCounts[userId].count++;
          
          if (task.status === 'rejected') {
            if (!userRejectionCounts[userId]) userRejectionCounts[userId] = { count: 0, name: userName };
            userRejectionCounts[userId].count++;
          }
        });

        completedTasksForProductivity.forEach(task => {
          if (!task.assignedToId || !task.assignedTo) return;
          const userId = task.assignedToId;
          const userName = task.assignedTo.name;
          const efficiencyRatio = task.actualTime / task.estimatedTime;
          if (!userProductivity[userId]) userProductivity[userId] = { totalRatio: 0, count: 0, name: userName };
          userProductivity[userId].totalRatio += efficiencyRatio;
          userProductivity[userId].count++;
        });

        let mostProductiveUser = null, leastProductiveUser = null, userWithMostTasks = null, userWithMostRejections = null;

        if (Object.keys(userProductivity).length > 0) {
          let minUserAvgRatio = Infinity, maxUserAvgRatio = 0;
          for (const userId in userProductivity) {
            const user = userProductivity[userId];
            const avgRatio = user.totalRatio / user.count;

            if (avgRatio < minUserAvgRatio) {
              minUserAvgRatio = avgRatio;
              mostProductiveUser = { name: user.name, avgEfficiencyRatio: parseFloat(avgRatio.toFixed(2)) };
            }
            if (avgRatio > maxUserAvgRatio) {
              maxUserAvgRatio = avgRatio;
              leastProductiveUser = { name: user.name, avgEfficiencyRatio: parseFloat(avgRatio.toFixed(2)) };
            }
          }
          // Prevent showing the same user as most and least productive if only one user has data
          if (mostProductiveUser && leastProductiveUser && mostProductiveUser.name === leastProductiveUser.name) {
            leastProductiveUser = null;
          }
        }
        
        if (Object.keys(userTaskCounts).length > 0) {
          let maxTasks = 0;
          for (const userId in userTaskCounts) {
            if (userTaskCounts[userId].count > maxTasks) {
              maxTasks = userTaskCounts[userId].count;
              userWithMostTasks = { name: userTaskCounts[userId].name, taskCount: maxTasks };
            }
          }
        }

        if (Object.keys(userRejectionCounts).length > 0) {
          let maxRejections = 0;
          for (const userId in userRejectionCounts) {
            if (userRejectionCounts[userId].count > maxRejections) {
              maxRejections = userRejectionCounts[userId].count;
              userWithMostRejections = { name: userRejectionCounts[userId].name, rejectionCount: maxRejections };
            }
          }
        }

        const performanceHighlights = {
          mostProductiveDepartment,
          mostProductiveUser,
          leastProductiveUser,
          userWithMostTasks,
          userWithMostRejections
        };

        if (format === 'json') {
          return res.json({
            type: 'professional_project',
            project: {
              id: professionalProject.id,
              title: professionalProject.title,
              description: professionalProject.description,
              status: professionalProject.status,
              startDate: professionalProject.startDate,
              dueDate: professionalProject.dueDate,
              completionRate: professionalProject.completionRate,
              priority: professionalProject.priority
            },
            kpis: teamKpis,
            charts: {
              statusDistribution: teamStatusDistribution,
              priorityDistribution: teamPriorityDistribution,
              departmentDistribution,
              userDistribution
            },
            insights: {
              totalTasks: teamKpis.totalTasks,
              completedTasks: teamKpis.completedTasks,
              overdueCount: teamKpis.overdueCount,
              completionRate: teamKpis.completionRate,
              rejectedTasks: teamKpis.rejectedTasks,
              teamMembers: teamKpis.teamMembers,
              tasksInReview: teamKpis.tasksInReview,
              extensionRequests: teamKpis.extensionRequests,
              highPriorityTasks: teamKpis.highPriorityTasks,
              projectCompletionRate: teamKpis.projectCompletionRate,
              projectStatus: teamKpis.projectStatus,
              performanceHighlights
            },
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              originalDueDate: task.originalDueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              assignedBy: task.assignedBy?.name || 'Unknown',
              department: task.Department?.name || 'No Department',
              rejectionReason: task.rejectionReason,
              extensionRequestReason: task.extensionRequestReason,
              extensionRequestDays: task.extensionRequestDays,
              extensionStatus: task.extensionStatus,
              color: task.color,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
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
          if (!t.dueDate || t.status === 'completed' || t.status === 'rejected') return false;
          const dueDate = new Date(t.dueDate);
          const now = new Date();
          // Reset time to compare only dates
          dueDate.setHours(0, 0, 0, 0);
          now.setHours(0, 0, 0, 0);
          return dueDate < now;
        });

        const allKpis = {
          totalTasks: tasks.length,
          completedTasks: allCompletedTasks.length,
          completionRate: tasks.length > 0 ? parseFloat((allCompletedTasks.length / tasks.length * 100).toFixed(1)) : 0,
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
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              originalDueDate: task.originalDueDate,
              completedAt: task.completedAt,
              estimatedTime: task.estimatedTime,
              actualTime: task.actualTime,
              assignedTo: task.assignedTo?.name || 'Unassigned',
              assignedBy: task.assignedBy?.name || 'Unknown',
              department: task.Department?.name || 'No Department',
              rejectionReason: task.rejectionReason,
              extensionRequestReason: task.extensionRequestReason,
              extensionRequestDays: task.extensionRequestDays,
              extensionStatus: task.extensionStatus,
              color: task.color,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
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
        // For professional tasks, also exclude rejected status
        if (scope.includes('professional') && t.status === 'rejected') return false;
        // For personal tasks, also exclude cancelled status
        if (scope.includes('personal') && t.status === 'cancelled') return false;
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        // Reset time to compare only dates
        dueDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).length,
      completionRate: tasks.length > 0 ? parseFloat((tasks.filter(t => t.status === 'completed').length / tasks.length * 100).toFixed(1)) : 0
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