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
  const csvContent = [
    // Header
    'Productivity Report',
    `Scope: ${scope.replace('_', ' ').toUpperCase()}`,
    `Generated on: ${safeFormat(new Date(), 'PPP')}`,
    '',
    // Insights
    'Key Insights',
    `Total Tasks,${insights.totalTasks}`,
    `Completion Rate,${insights.completionRate.toFixed(1)}%`,
    `Overdue Tasks,${insights.overdueCount}`,
    `Average Duration,${(insights.averageDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`,
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
    ] : []),
    // Task Details
    'Task Details',
    parser.parse(taskData)
  ].join('\n');

  return csvContent;
};

module.exports = {
  generateCSV
}; 