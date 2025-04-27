const { PersonalTask, ProfessionalTask, User, PersonalProject, ProfessionalProject } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

// @desc    Get all tasks for calendar view within date range
// @route   GET /api/calendar
// @access  Private
exports.getCalendarTasks = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Please provide start and end dates', 400));
  }
  
  // Convert dates to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get personal tasks for the date range
  const personalTasks = await PersonalTask.findAll({
    where: {
      userId: req.user.id,
      dueDate: {
        [Op.between]: [start, end]
      }
    },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }],
    order: [['dueDate', 'ASC']]
  });
  
  // Get professional tasks for the date range
  const professionalTasks = await ProfessionalTask.findAll({
    where: {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ],
      dueDate: {
        [Op.between]: [start, end]
      }
    },
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      }
    ],
    order: [['dueDate', 'ASC']]
  });
  
  // Format tasks for calendar
  const calendarEvents = [
    ...personalTasks.map(task => ({
      id: `personal-${task.id}`,
      title: task.title,
      start: task.dueDate,
      allDay: true,
      extendedProps: {
        type: 'personal',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        projectTitle: task.PersonalProject ? task.PersonalProject.title : null,
        color: task.color || (task.PersonalProject ? task.PersonalProject.color : '#6c757d')
      }
    })),
    ...professionalTasks.map(task => ({
      id: `professional-${task.id}`,
      title: task.title,
      start: task.dueDate,
      allDay: true,
      extendedProps: {
        type: 'professional',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        projectTitle: task.ProfessionalProject ? task.ProfessionalProject.title : null,
        assignedTo: task.assignedTo ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name
        } : null,
        color: task.color || (task.ProfessionalProject ? task.ProfessionalProject.color : '#007bff')
      }
    }))
  ];
  
  res.status(200).json({
    success: true,
    count: calendarEvents.length,
    data: calendarEvents
  });
});

// @desc    Get daily calendar view
// @route   GET /api/calendar/daily/:date
// @access  Private
exports.getDailyCalendar = asyncHandler(async (req, res, next) => {
  const dateParam = req.params.date;
  
  if (!dateParam) {
    return next(new ErrorResponse('Please provide a date', 400));
  }
  
  // Parse the date and create start/end range for the day
  const date = new Date(dateParam);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  // Get tasks for the day
  const personalTasks = await PersonalTask.findAll({
    where: {
      userId: req.user.id,
      dueDate: {
        [Op.between]: [startOfDay, endOfDay]
      }
    },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }],
    order: [['priority', 'DESC']]
  });
  
  const professionalTasks = await ProfessionalTask.findAll({
    where: {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ],
      dueDate: {
        [Op.between]: [startOfDay, endOfDay]
      }
    },
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      }
    ],
    order: [['priority', 'DESC']]
  });
  
  res.status(200).json({
    success: true,
    data: {
      date: startOfDay,
      personalTasks,
      professionalTasks,
      totalTasks: personalTasks.length + professionalTasks.length
    }
  });
});

// @desc    Get weekly calendar view
// @route   GET /api/calendar/weekly/:startDate
// @access  Private
exports.getWeeklyCalendar = asyncHandler(async (req, res, next) => {
  const startDateParam = req.params.startDate;
  
  if (!startDateParam) {
    return next(new ErrorResponse('Please provide a start date', 400));
  }
  
  // Parse the start date and create end date (7 days later)
  const startDate = new Date(startDateParam);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  // Start date should be at beginning of day
  startDate.setHours(0, 0, 0, 0);
  
  // Get tasks for the week
  const personalTasks = await PersonalTask.findAll({
    where: {
      userId: req.user.id,
      dueDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }],
    order: [['dueDate', 'ASC'], ['priority', 'DESC']]
  });
  
  const professionalTasks = await ProfessionalTask.findAll({
    where: {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ],
      dueDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      }
    ],
    order: [['dueDate', 'ASC'], ['priority', 'DESC']]
  });
  
  // Group tasks by day
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(day.setHours(23, 59, 59, 999));
    
    const dayPersonalTasks = personalTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    
    const dayProfessionalTasks = professionalTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    
    weekDays.push({
      date: new Date(dayStart),
      personalTasks: dayPersonalTasks,
      professionalTasks: dayProfessionalTasks,
      totalTasks: dayPersonalTasks.length + dayProfessionalTasks.length
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      startDate,
      endDate,
      days: weekDays,
      totalPersonalTasks: personalTasks.length,
      totalProfessionalTasks: professionalTasks.length
    }
  });
});

// @desc    Get monthly calendar view
// @route   GET /api/calendar/monthly/:year/:month
// @access  Private
exports.getMonthlyCalendar = asyncHandler(async (req, res, next) => {
  const { year, month } = req.params;
  
  if (!year || !month) {
    return next(new ErrorResponse('Please provide year and month', 400));
  }
  
  // Create start date (1st of month) and end date (last day of month)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  // Get tasks for the month
  const personalTasks = await PersonalTask.findAll({
    where: {
      userId: req.user.id,
      dueDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }],
    order: [['dueDate', 'ASC']]
  });
  
  const professionalTasks = await ProfessionalTask.findAll({
    where: {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ],
      dueDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name']
      }
    ],
    order: [['dueDate', 'ASC']]
  });
  
  // Group tasks by day of month
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month - 1, i);
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(day.setHours(23, 59, 59, 999));
    
    const dayPersonalTasks = personalTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    
    const dayProfessionalTasks = professionalTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    
    monthDays.push({
      date: new Date(dayStart),
      dayOfMonth: i,
      dayOfWeek: dayStart.getDay(),
      personalTasks: dayPersonalTasks,
      professionalTasks: dayProfessionalTasks,
      totalTasks: dayPersonalTasks.length + dayProfessionalTasks.length
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      year: parseInt(year),
      month: parseInt(month),
      days: monthDays,
      totalPersonalTasks: personalTasks.length,
      totalProfessionalTasks: professionalTasks.length
    }
  });
});