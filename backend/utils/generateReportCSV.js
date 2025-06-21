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
    'department',
    'project',
    'dueDate',
    'completedAt',
    'estimatedTime',
    'actualTime',
    'createdAt'
  ];

  // Transform tasks data for CSV
  const taskData = tasks.map(task => ({
    title: task.title || '',
    status: task.status || '',
    priority: task.priority || '',
    assignedTo: task.assignedTo?.name || task.User?.name || 'Unassigned',
    department: task.Department?.name || task.department || 'No Department',
    project: task.ProfessionalProject?.title || task.PersonalProject?.title || task.project || 'No Project',
    dueDate: safeFormat(task.dueDate, 'PP'),
    completedAt: safeFormat(task.completedAt, 'PP'),
    estimatedTime: task.estimatedTime ? `${task.estimatedTime} minutes` : '',
    actualTime: task.actualTime ? `${task.actualTime} minutes` : '',
    createdAt: safeFormat(task.createdAt, 'PP')
  }));

  // Create CSV parser
  const parser = new Parser({ fields: taskFields });

  // Generate CSV content
  const scopeDisplay = {
    'personal_tasks': 'Personal Tasks',
    'personal_project': 'Personal Project',
    'professional_project': 'Professional Project',
    'all_professional': 'All Professional Projects'
  };

  const csvContent = [
    // Header
    'Productivity Report',
    `Scope: ${scopeDisplay[scope] || scope}`,
    `Generated on: ${safeFormat(new Date(), 'PPP')}`,
    '',
    // Key Performance Indicators
    'Key Performance Indicators',
    `Total Tasks,${insights.totalTasks}`,
    `Completed Tasks,${insights.completedTasks}`,
    `Completion Rate,${insights.completionRate.toFixed(1)}%`,
    `Overdue Tasks,${insights.overdueCount}`,
    '',
    // Status Distribution
    'Task Status Distribution',
    'Status,Count',
    ...Object.entries(tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {})).map(([status, count]) => `${status.replace('-', ' ').toUpperCase()},${count}`),
    '',
    // Priority Distribution
    'Task Priority Distribution',
    'Priority,Count',
    ...Object.entries(tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {})).map(([priority, count]) => `${priority.toUpperCase()},${count}`),
    '',
    // Department Distribution (for professional tasks)
    ...(scope.includes('professional') ? [
      'Tasks per Department',
      'Department,Count',
      ...Object.entries(tasks.reduce((acc, task) => {
        const deptName = task.Department?.name || task.department || 'No Department';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {})).map(([dept, count]) => `${dept},${count}`),
      ''
    ] : []),
    // User Distribution
    'Tasks per User',
    'User,Count',
    ...Object.entries(tasks.reduce((acc, task) => {
      const userName = task.assignedTo?.name || task.User?.name || 'Unassigned';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {})).map(([user, count]) => `${user},${count}`),
    '',
    // Task Details
    'Task Details',
    parser.parse(taskData)
  ].join('\n');

  return csvContent;
};

module.exports = {
  generateCSV
}; 