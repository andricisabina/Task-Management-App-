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

  // Add report info
  summarySheet.addRow(['Report Scope', scope.replace('_', ' ').toUpperCase()]);
  summarySheet.addRow(['Generated On', safeFormat(new Date(), 'PPP')]);
  summarySheet.addRow([]);

  // Add Key Performance Indicators
  const isTeamProject = scope === 'professional_project';
  const isMyProjects = scope === 'personal_project';
  if (isTeamProject) {
    summarySheet.addRow(['Team Project KPIs']);
    summarySheet.addRow(['Total Team Projects', insights.totalTeamProjects]);
    summarySheet.addRow(['Team Members', insights.teamMembers]);
    summarySheet.addRow(['Most Active Department', insights.mostActiveDepartment]);
    summarySheet.addRow(['Task Rejections', insights.taskRejections]);
    summarySheet.addRow(['Avg Acceptance Time (days)', insights.avgAcceptanceTime?.toFixed(2)]);
    summarySheet.addRow([]);
    // Team Project Charts
    summarySheet.addRow(['Tasks per Department']);
    summarySheet.addRow(['Department', 'Count']);
    if (insights.tasksPerDept) {
      insights.tasksPerDept.labels.forEach((dept, i) => {
        summarySheet.addRow([dept, insights.tasksPerDept.datasets[0].data[i]]);
      });
    }
    summarySheet.addRow([]);
    summarySheet.addRow(['Task Status by Department']);
    summarySheet.addRow(['Department', 'Completed', 'In Progress', 'Pending', 'Rejected']);
    if (insights.taskStatusByDept) {
      insights.taskStatusByDept.labels.forEach((dept, i) => {
        const d = insights.taskStatusByDept.datasets;
        summarySheet.addRow([
          dept,
          d[0].data[i],
          d[1].data[i],
          d[2].data[i],
          d[3].data[i]
        ]);
      });
    }
    summarySheet.addRow([]);
    summarySheet.addRow(['Tasks per User']);
    summarySheet.addRow(['User', 'Count']);
    if (insights.tasksPerUser) {
      insights.tasksPerUser.labels.forEach((user, i) => {
        summarySheet.addRow([user, insights.tasksPerUser.datasets[0].data[i]]);
      });
    }
    summarySheet.addRow([]);
  } else if (isMyProjects) {
    summarySheet.addRow(['My Projects KPIs']);
    summarySheet.addRow(['Total Projects', insights.totalProjects]);
    summarySheet.addRow(['Project Completed', insights.projectCompleted ? 'Yes' : 'No']);
    summarySheet.addRow(['Avg Tasks per Project', insights.avgTasksPerProject]);
    summarySheet.addRow(['Avg Project Duration', `${(insights.avgProjectDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`]);
    summarySheet.addRow([]);
    // My Projects Charts
    summarySheet.addRow(['Project Completion %']);
    summarySheet.addRow(['Completion %']);
    if (insights.projectCompletionBar) {
      insights.projectCompletionBar.datasets[0].data.forEach((val, i) => {
        summarySheet.addRow(['Project', `${val.toFixed(1)}%`]);
      });
    }
    summarySheet.addRow([]);
    summarySheet.addRow(['Task Status per Project']);
    summarySheet.addRow(['Status', 'Count']);
    if (insights.taskStatusStacked) {
      insights.taskStatusStacked.datasets.forEach(ds => {
        summarySheet.addRow([ds.label, ds.data[0]]);
      });
    }
    summarySheet.addRow([]);
    summarySheet.addRow(['Gantt Data']);
    summarySheet.addRow(['Task', 'Start', 'End']);
    if (insights.ganttData) {
      insights.ganttData.forEach(g => {
        summarySheet.addRow([g.label, safeFormat(g.start, 'PP'), safeFormat(g.end, 'PP')]);
      });
    }
    summarySheet.addRow([]);
  } else {
    summarySheet.addRow(['Key Performance Indicators']);
    summarySheet.addRow(['Total Tasks', insights.totalTasks]);
    summarySheet.addRow(['Completed Tasks', insights.completedTasks]);
    summarySheet.addRow(['Completion Rate', `${insights.completionRate.toFixed(1)}%`]);
    summarySheet.addRow(['Overdue Tasks', insights.overdueCount]);
    summarySheet.addRow(['Average Duration', `${(insights.averageDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days`]);
    summarySheet.addRow([]);
    // Add Task Status Distribution
    summarySheet.addRow(['Task Status Distribution']);
    summarySheet.addRow(['Status', 'Count']);
    summarySheet.addRow(['Completed', tasks.filter(t => t.status === 'completed').length]);
    summarySheet.addRow(['In Progress', tasks.filter(t => t.status === 'in_progress').length]);
    summarySheet.addRow(['Pending', tasks.filter(t => t.status === 'pending').length]);
    summarySheet.addRow(['Overdue', insights.overdueCount]);
    summarySheet.addRow([]);
    // Add department performance if available
    if (insights.departmentPerformance) {
      summarySheet.addRow(['Department Performance']);
      summarySheet.addRow(['Department', 'Completion Rate']);
      insights.departmentPerformance.departments.forEach(dept => {
        summarySheet.addRow([dept.name, `${dept.completionRate.toFixed(1)}%`]);
      });
      summarySheet.addRow(['Most Active User', insights.departmentPerformance.mostActiveUser]);
      summarySheet.addRow([]);
    }
  }

  // Style the summary sheet
  const headerRows = [1, 5, 13]; // Rows with section headers
  headerRows.forEach(rowNum => {
    summarySheet.getRow(rowNum).font = { bold: true, size: 12 };
    summarySheet.getRow(rowNum).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

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