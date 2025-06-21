const ExcelJS = require('exceljs');
const { format } = require('date-fns');
const safeFormat = (date, fmt) => {
  if (!date || isNaN(new Date(date))) return '';
  return format(new Date(date), fmt);
};

const generateExcel = async ({ tasks, insights, scope }) => {
  const workbook = new ExcelJS.Workbook();
  
  // Add metadata
  workbook.creator = 'Task Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const scopeDisplay = {
    'personal_tasks': 'Personal Tasks',
    'personal_project': 'Personal Project',
    'professional_project': 'Professional Project',
    'all_professional': 'All Professional Projects'
  };

  // Add report info
  summarySheet.addRow(['Report Scope', scopeDisplay[scope] || scope]);
  summarySheet.addRow(['Generated On', safeFormat(new Date(), 'PPP')]);
  summarySheet.addRow([]);

  // Add Key Performance Indicators
  summarySheet.addRow(['Key Performance Indicators']);
  summarySheet.addRow(['Total Tasks', insights.totalTasks]);
  summarySheet.addRow(['Completed Tasks', insights.completedTasks]);
  summarySheet.addRow(['Completion Rate', `${insights.completionRate.toFixed(1)}%`]);
  summarySheet.addRow(['Overdue Tasks', insights.overdueCount]);
  summarySheet.addRow([]);

  // Add Status Distribution
  summarySheet.addRow(['Task Status Distribution']);
  summarySheet.addRow(['Status', 'Count']);
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
  Object.entries(statusCounts).forEach(([status, count]) => {
    summarySheet.addRow([status.replace('-', ' ').toUpperCase(), count]);
  });
  summarySheet.addRow([]);

  // Add Priority Distribution
  summarySheet.addRow(['Task Priority Distribution']);
  summarySheet.addRow(['Priority', 'Count']);
  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {});
  Object.entries(priorityCounts).forEach(([priority, count]) => {
    summarySheet.addRow([priority.toUpperCase(), count]);
  });
  summarySheet.addRow([]);

  // Add Department Distribution (for professional tasks)
  if (scope.includes('professional')) {
    summarySheet.addRow(['Tasks per Department']);
    summarySheet.addRow(['Department', 'Count']);
    const deptCounts = tasks.reduce((acc, task) => {
      const deptName = task.Department?.name || task.department || 'No Department';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {});
    Object.entries(deptCounts).forEach(([dept, count]) => {
      summarySheet.addRow([dept, count]);
    });
    summarySheet.addRow([]);
  }

  // Add User Distribution
  summarySheet.addRow(['Tasks per User']);
  summarySheet.addRow(['User', 'Count']);
  const userCounts = tasks.reduce((acc, task) => {
    const userName = task.assignedTo?.name || task.User?.name || 'Unassigned';
    acc[userName] = (acc[userName] || 0) + 1;
    return acc;
  }, {});
  Object.entries(userCounts).forEach(([user, count]) => {
    summarySheet.addRow([user, count]);
  });
  summarySheet.addRow([]);

  // Style the summary sheet
  const headerRows = [1, 5, 8, 12, 16, 20]; // Rows with section headers
  headerRows.forEach(rowNum => {
    if (summarySheet.getRow(rowNum)) {
      summarySheet.getRow(rowNum).font = { bold: true, size: 12 };
      summarySheet.getRow(rowNum).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }
  });

  // Create Tasks sheet
  const tasksSheet = workbook.addWorksheet('Tasks');
  tasksSheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Project', key: 'project', width: 25 },
    { header: 'Due Date', key: 'dueDate', width: 15 },
    { header: 'Completed At', key: 'completedAt', width: 15 },
    { header: 'Estimated Time', key: 'estimatedTime', width: 15 },
    { header: 'Actual Time', key: 'actualTime', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 15 }
  ];

  // Add task data
  tasks.forEach(task => {
    tasksSheet.addRow({
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
    });
  });

  // Style the tasks sheet
  tasksSheet.getRow(1).font = { bold: true };
  tasksSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add borders to all cells
  [summarySheet, tasksSheet].forEach(sheet => {
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  });

  // Generate Excel buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  generateExcel
}; 