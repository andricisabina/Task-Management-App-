const { Parser } = require('json2csv');
const { format } = require('date-fns');
const safeFormat = (date, fmt) => {
  if (!date || isNaN(new Date(date))) return '';
  return format(new Date(date), fmt);
};

const generateCSV = ({ tasks, insights, scope }) => {
  // Define fields for task data
  const taskFields = [
    'title',
    'status',
    'priority',
    'assignedTo',
    'startDate',
    'endDate',
    'description'
  ];

  // Transform tasks data for CSV
  const taskData = tasks.map(task => ({
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignedTo: task.User?.name || 'Unassigned',
    startDate: safeFormat(task.startDate, 'PP'),
    endDate: safeFormat(task.endDate, 'PP'),
    description: task.description
  }));

  // Create CSV parser
  const parser = new Parser({ fields: taskFields });

  // Generate CSV content
  const isTeamProject = scope === 'professional_project';
  const isMyProjects = scope === 'personal_project';
  const csvContent = [
    // Header
    'Productivity Report',
    `Scope: ${scope.replace('_', ' ').toUpperCase()}`,
    `Generated on: ${safeFormat(new Date(), 'PPP')}`,
    '',
    // Key Performance Indicators
    isTeamProject ? 'Team Project KPIs' : isMyProjects ? 'My Projects KPIs' : 'Key Performance Indicators',
    ...(isTeamProject ? [
      `Total Team Projects,${insights.totalTeamProjects}`,
      `Team Members,${insights.teamMembers}`,
      `Most Active Department,${insights.mostActiveDepartment}`,
      `Task Rejections,${insights.taskRejections}`,
      `Avg Acceptance Time (days),${insights.avgAcceptanceTime?.toFixed(2)}`
    ] : isMyProjects ? [
      `Total Projects,${insights.totalProjects}`,
      `Project Completed,${insights.projectCompleted ? 'Yes' : 'No'}`,
      `Avg Tasks per Project,${insights.avgTasksPerProject}`,
      `Avg Project Duration,${(insights.avgProjectDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`
    ] : [
      `Total Tasks,${insights.totalTasks}`,
      `Completed Tasks,${insights.completedTasks}`,
      `Completion Rate,${insights.completionRate.toFixed(1)}%`,
      `Overdue Tasks,${insights.overdueCount}`,
      `Average Duration,${(insights.averageDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`
    ]),
    '',
    // My Projects Charts
    ...(isMyProjects ? [
      'Project Completion %',
      'Completion %',
      ...(insights.projectCompletionBar ? insights.projectCompletionBar.datasets[0].data.map((val, i) => `Project,${val.toFixed(1)}%`) : []),
      '',
      'Task Status per Project',
      'Status,Count',
      ...(insights.taskStatusStacked ? insights.taskStatusStacked.datasets.map(ds => `${ds.label},${ds.data[0]}`) : []),
      '',
      'Gantt Data',
      'Task,Start,End',
      ...(insights.ganttData ? insights.ganttData.map(g => `${g.label},${safeFormat(g.start, 'PP')},${safeFormat(g.end, 'PP')}`) : []),
      ''
    ] : isTeamProject ? [
      'Tasks per Department',
      'Department,Count',
      ...(insights.tasksPerDept ? insights.tasksPerDept.labels.map((dept, i) => `${dept},${insights.tasksPerDept.datasets[0].data[i]}`) : []),
      '',
      'Task Status by Department',
      'Department,Completed,In Progress,Pending,Rejected',
      ...(insights.taskStatusByDept ? insights.taskStatusByDept.labels.map((dept, i) => {
        const d = insights.taskStatusByDept.datasets;
        return `${dept},${d[0].data[i]},${d[1].data[i]},${d[2].data[i]},${d[3].data[i]}`;
      }) : []),
      '',
      'Tasks per User',
      'User,Count',
      ...(insights.tasksPerUser ? insights.tasksPerUser.labels.map((user, i) => `${user},${insights.tasksPerUser.datasets[0].data[i]}`) : []),
      ''
    ] : [
      // Task Status Distribution
      'Task Status Distribution',
      'Status,Count',
      `Completed,${tasks.filter(t => t.status === 'completed').length}`,
      `In Progress,${tasks.filter(t => t.status === 'in_progress').length}`,
      `Pending,${tasks.filter(t => t.status === 'pending').length}`,
      `Overdue,${insights.overdueCount}`,
      '',
      // Department Performance (if available)
      ...(insights.departmentPerformance ? [
        'Department Performance',
        'Department,Completion Rate',
        ...insights.departmentPerformance.departments.map(dept => 
          `${dept.name},${dept.completionRate.toFixed(1)}%`
        ),
        `Most Active User,${insights.departmentPerformance.mostActiveUser}`,
        ''
      ] : [])
    ]),
    // Task Details
    'Task Details',
    parser.parse(taskData)
  ].join('\n');

  return csvContent;
};

module.exports = {
  generateCSV
}; 