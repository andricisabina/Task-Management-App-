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
    { header: 'Metric', key: 'metric', width: 20 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  summarySheet.addRow(['Report Scope', scope.replace('_', ' ').toUpperCase()]);
  summarySheet.addRow(['Generated On', safeFormat(new Date(), 'PPP')]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Key Insights']);
  summarySheet.addRow(['Total Tasks', insights.totalTasks]);
  summarySheet.addRow(['Completion Rate', `${insights.completionRate.toFixed(1)}%`]);
  summarySheet.addRow(['Overdue Tasks', insights.overdueCount]);
  summarySheet.addRow(['Average Duration', `${(insights.averageDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`]);

  // Add department performance if available
  if (insights.departmentPerformance) {
    summarySheet.addRow([]);
    summarySheet.addRow(['Department Performance']);
    summarySheet.addRow(['Department', 'Completion Rate']);
    insights.departmentPerformance.departments.forEach(dept => {
      summarySheet.addRow([dept.name, `${dept.completionRate.toFixed(1)}%`]);
    });
    summarySheet.addRow(['Most Active User', insights.departmentPerformance.mostActiveUser]);
  }

  // Style the summary sheet
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(5).font = { bold: true };
  if (insights.departmentPerformance) {
    summarySheet.getRow(11).font = { bold: true };
  }

  // Create Tasks sheet
  const tasksSheet = workbook.addWorksheet('Tasks');
  tasksSheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'End Date', key: 'endDate', width: 15 },
    { header: 'Description', key: 'description', width: 40 }
  ];

  // Add task data
  tasks.forEach(task => {
    tasksSheet.addRow({
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedTo: task.User?.name || 'Unassigned',
      startDate: safeFormat(task.startDate, 'PP'),
      endDate: safeFormat(task.endDate, 'PP'),
      description: task.description
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