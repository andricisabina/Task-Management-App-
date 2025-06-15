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
        // KPIs
        const completedTasksArr = tasks.filter(t => t.status === 'completed' && t.completedAt && t.startDate);
        const kpis = {
          completionRate: (tasks.filter(t => t.status === 'completed').length / tasks.length * 100) || 0,
          overdueTasks: tasks.filter(t => {
            const isOverdue = new Date(t.dueDate) < new Date();
            return t.status !== 'completed' && isOverdue;
          }).length,
          averageDuration: completedTasksArr.length
            ? completedTasksArr.reduce((acc, t) => acc + (new Date(t.completedAt) - new Date(t.startDate)), 0) / completedTasksArr.length
            : 0,
          totalTasks: tasks.length
        };
        // Charts
        // 1. Status Distribution (Pie)
        const statusDistribution = {
          labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
          datasets: [{
            data: [
              tasks.filter(t => t.status === 'completed').length,
              tasks.filter(t => t.status === 'in_progress').length,
              tasks.filter(t => t.status === 'pending').length,
              tasks.filter(t => {
                const isOverdue = new Date(t.dueDate) < new Date();
                return t.status !== 'completed' && isOverdue;
              }).length
            ],
            backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
          }]
        };
        // 2. Completed Per Day (Line)
        const completedPerDayMap = {};
        completedTasksArr.forEach(t => {
          const day = new Date(t.completedAt).toISOString().slice(0, 10);
          completedPerDayMap[day] = (completedPerDayMap[day] || 0) + 1;
        });
        const completedPerDay = {
          labels: Object.keys(completedPerDayMap).sort(),
          datasets: [{
            label: 'Tasks Completed',
            data: Object.keys(completedPerDayMap).sort().map(day => completedPerDayMap[day]),
            fill: false,
            borderColor: '#4CAF50',
            tension: 0.1
          }]
        };
        // 3. Estimated vs Actual Duration (Bar)
        const estimatedVsActual = {
          labels: completedTasksArr.map(t => t.title),
          datasets: [
            {
              label: 'Estimated (days)',
              data: completedTasksArr.map(t => t.estimatedDuration ? t.estimatedDuration : 0),
              backgroundColor: '#FFC107'
            },
            {
              label: 'Actual (days)',
              data: completedTasksArr.map(t => {
                const duration = (new Date(t.completedAt) - new Date(t.startDate)) / (1000 * 60 * 60 * 24);
                return Number.isFinite(duration) ? duration : 0;
              }),
              backgroundColor: '#2196F3'
            }
          ]
        };
        // Insights
        let onTimeCount = 0;
        let dayCounts = {};
        completedTasksArr.forEach(t => {
          if (t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)) onTimeCount++;
          const day = t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : null;
          if (day) dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const onTimeCompletionRate = completedTasksArr.length ? (onTimeCount / completedTasksArr.length) * 100 : 0;
        const mostProductiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const insightMessages = [];
        if (completedTasksArr.length > 0) {
          insightMessages.push(`You completed tasks on time in ${onTimeCompletionRate.toFixed(0)}% of cases.`);
        }
        if (mostProductiveDay) {
          insightMessages.push(`Most productive day: ${new Date(mostProductiveDay).toLocaleDateString()}.`);
        }
        if (insightMessages.length === 0) {
          insightMessages.push('No on-time completions or notable productivity trends for this period.');
        }
        if (format === 'json') {
          return res.json({
            type: 'my_tasks',
            kpis,
            charts: {
              statusDistribution,
              completedPerDay,
              estimatedVsActual
            },
            insights: {
              onTimeCompletionRate,
              mostProductiveDay,
              insightMessages
            },
            tasks
          });
        }
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
        // KPIs
        const totalProjects = 1;
        const projectCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');
        const avgTasksPerProject = tasks.length;
        const completedTasksArrPP = tasks.filter(t => t.status === 'completed' && t.completedAt && t.startDate);
        const avgProjectDuration = completedTasksArrPP.length
          ? completedTasksArrPP.reduce((acc, t) => acc + (new Date(t.completedAt) - new Date(t.startDate)), 0) / completedTasksArrPP.length
          : 0;
        const kpisPersonalProject = {
          totalProjects,
          projectCompleted,
          avgTasksPerProject,
          avgProjectDuration
        };
        // Charts
        // 1. Project Completion % (Bar)
        const completionPercent = tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0;
        const projectCompletionBar = {
          labels: ['Completion %'],
          datasets: [{
            label: 'Project Completion',
            data: [completionPercent],
            backgroundColor: '#4CAF50'
          }]
        };
        // 2. Task Status per Project (Stacked Bar)
        const statusCounts = { completed: 0, in_progress: 0, pending: 0, overdue: 0 };
        tasks.forEach(t => {
          if (t.status === 'completed') statusCounts.completed++;
          else if (t.status === 'in_progress') statusCounts.in_progress++;
          else if (t.status === 'pending' || t.status === 'todo') statusCounts.pending++;
          else if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed') statusCounts.overdue++;
        });
        const taskStatusStacked = {
          labels: ['Tasks'],
          datasets: [
            { label: 'Completed', data: [statusCounts.completed], backgroundColor: '#4CAF50' },
            { label: 'In Progress', data: [statusCounts.in_progress], backgroundColor: '#2196F3' },
            { label: 'Pending', data: [statusCounts.pending], backgroundColor: '#FFC107' },
            { label: 'Overdue', data: [statusCounts.overdue], backgroundColor: '#F44336' }
          ]
        };
        // 3. Gantt-style project timelines (as data)
        const ganttData = tasks.map(t => ({
          label: t.title,
          start: t.startDate,
          end: t.completedAt || t.dueDate
        }));
        // Insights
        const projectsCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');
        const timeSpent = completedTasksArrPP.length
          ? completedTasksArrPP.reduce((acc, t) => acc + (new Date(t.completedAt) - new Date(t.startDate)), 0) / completedTasksArrPP.length
          : 0;
        const insightMessagesPP = [];
        if (projectsCompleted) {
          insightMessagesPP.push('This project was completed.');
        } else {
          insightMessagesPP.push('This project is ongoing.');
        }
        if (format === 'json') {
          return res.json({
            type: 'my_projects',
            kpis: kpisPersonalProject,
            charts: {
              projectCompletionBar,
              taskStatusStacked,
              ganttData
            },
            insights: {
              projectsCompleted,
              timeSpent,
              insightMessages: insightMessagesPP
            },
            tasks
          });
        }
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
        // KPIs
        const teamMembers = Array.from(new Set(tasks.map(t => t.assignedTo?.name).filter(Boolean)));
        // Department extraction via task.departmentId
        // Build a map of departmentId to department name from the project
        const projectDepartments = (tasks[0]?.ProfessionalProject?.departments || []).reduce((acc, d) => {
          acc[d.id] = d.name;
          return acc;
        }, {});
        const departmentCounts = tasks.reduce((acc, t) => {
          const deptId = t.departmentId;
          const deptName = deptId ? (projectDepartments[deptId] || `Dept ${deptId}`) : 'No Department';
          acc[deptName] = (acc[deptName] || 0) + 1;
          return acc;
        }, {});
        const mostActiveDepartment = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
        const taskRejections = tasks.filter(t => t.status === 'rejected').length;
        const acceptanceTimes = tasks.filter(t => t.acceptedAt && t.createdAt).map(t => new Date(t.acceptedAt) - new Date(t.createdAt));
        const avgAcceptanceTime = acceptanceTimes.length ? acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length : 0;
        const kpisTeam = {
          totalTeamProjects: 1, // since this is for a single project
          teamMembers: teamMembers.length,
          mostActiveDepartment,
          taskRejections,
          avgAcceptanceTime: avgAcceptanceTime / (1000 * 60 * 60 * 24) // in days
        };
        // Charts
        // 1. Tasks per Department (Bar)
        const tasksPerDept = {
          labels: Object.keys(departmentCounts),
          datasets: [{
            label: 'Tasks per Department',
            data: Object.values(departmentCounts),
            backgroundColor: '#2196F3'
          }]
        };
        // 2. Task Status by Department (Stacked Bar)
        const deptStatusMap = {};
        tasks.forEach(t => {
          const deptId = t.departmentId;
          const deptName = deptId ? (projectDepartments[deptId] || `Dept ${deptId}`) : 'No Department';
          if (!deptStatusMap[deptName]) deptStatusMap[deptName] = { completed: 0, in_progress: 0, pending: 0, rejected: 0 };
          deptStatusMap[deptName][t.status] = (deptStatusMap[deptName][t.status] || 0) + 1;
        });
        const taskStatusByDept = {
          labels: Object.keys(deptStatusMap),
          datasets: [
            {
              label: 'Completed',
              data: Object.values(deptStatusMap).map(s => s.completed || 0),
              backgroundColor: '#4CAF50'
            },
            {
              label: 'In Progress',
              data: Object.values(deptStatusMap).map(s => s.in_progress || 0),
              backgroundColor: '#2196F3'
            },
            {
              label: 'Pending',
              data: Object.values(deptStatusMap).map(s => s.pending || 0),
              backgroundColor: '#FFC107'
            },
            {
              label: 'Rejected',
              data: Object.values(deptStatusMap).map(s => s.rejected || 0),
              backgroundColor: '#F44336'
            }
          ]
        };
        // 3. Tasks per User (Bar)
        const userCounts = tasks.reduce((acc, t) => {
          const user = t.assignedTo?.name || 'Unassigned';
          acc[user] = (acc[user] || 0) + 1;
          return acc;
        }, {});
        const tasksPerUser = {
          labels: Object.keys(userCounts),
          datasets: [{
            label: 'Tasks per User',
            data: Object.values(userCounts),
            backgroundColor: '#FFC107'
          }]
        };
        // Insights
        const percentRejected = tasks.length ? (tasks.filter(t => t.status === 'rejected').length / tasks.length) * 100 : 0;
        // Department completion rates
        const departmentCompletionRates = {};
        Object.keys(departmentCounts).forEach(dept => {
          const deptTasks = tasks.filter(t => {
            const deptId = t.departmentId;
            const deptName = deptId ? (projectDepartments[deptId] || `Dept ${deptId}`) : 'No Department';
            return deptName === dept;
          });
          const completed = deptTasks.filter(t => t.status === 'completed').length;
          departmentCompletionRates[dept] = deptTasks.length ? (completed / deptTasks.length) * 100 : 0;
        });
        // Fastest acceptance user
        const userAcceptanceTimes = {};
        tasks.forEach(t => {
          if (t.acceptedAt && t.createdAt && t.assignedTo?.name) {
            const diff = new Date(t.acceptedAt) - new Date(t.createdAt);
            if (!userAcceptanceTimes[t.assignedTo.name]) userAcceptanceTimes[t.assignedTo.name] = [];
            userAcceptanceTimes[t.assignedTo.name].push(diff);
          }
        });
        let fastestAcceptanceUser = null;
        let fastestTime = null;
        Object.entries(userAcceptanceTimes).forEach(([user, times]) => {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          if (fastestTime === null || avg < fastestTime) {
            fastestTime = avg;
            fastestAcceptanceUser = user;
          }
        });
        const insightMessagesTeam = [];
        Object.entries(departmentCompletionRates).forEach(([dept, rate]) => {
          if (dept !== 'No Department') {
            insightMessagesTeam.push(`${dept} completed ${rate.toFixed(0)}% of their assigned tasks.`);
          }
        });
        if (fastestAcceptanceUser && fastestTime !== null) {
          insightMessagesTeam.push(`${fastestAcceptanceUser} has the fastest average task acceptance time (${(fastestTime / (1000 * 60 * 60)).toFixed(1)}h).`);
        }
        if (percentRejected > 0) {
          insightMessagesTeam.push(`${percentRejected.toFixed(1)}% of tasks were rejected.`);
        }
        if (format === 'json') {
          return res.json({
            type: 'team_projects',
            kpis: kpisTeam,
            charts: {
              tasksPerDept,
              taskStatusByDept,
              tasksPerUser
            },
            insights: {
              percentRejected,
              departmentCompletionRates,
              fastestAcceptanceUser,
              fastestTime,
              insightMessages: insightMessagesTeam
            },
            tasks
          });
        }
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
    if (format === 'csv') {
      const csvContent = generateCSV({ tasks, insights, scope });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${scope}.csv`);
      return res.send(csvContent);
    } else if (format === 'excel') {
      const excelBuffer = await generateExcel({ tasks, insights, scope });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${scope}.xlsx`);
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