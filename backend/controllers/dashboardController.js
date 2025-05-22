const { 
    User, 
    Department, 
    PersonalTask, 
    ProfessionalTask, 
    PersonalProject, 
    ProfessionalProject,
    sequelize 
  } = require('../models');
  const asyncHandler = require('../middleware/asyncHandler');
  const ErrorResponse = require('../utils/errorResponse');
  const { Op } = require('sequelize');
  
  // @desc    Get user dashboard data
  // @route   GET /api/dashboard/user
  // @access  Private
  exports.getUserDashboard = asyncHandler(async (req, res, next) => {
    // Get today's date and set time to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get upcoming week date (7 days from today)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Tasks due today
    const personalTasksDueToday = await PersonalTask.findAll({
      where: {
        userId: req.user.id,
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: { [Op.notIn]: ['completed', 'cancelled'] }
      },
      include: [{
        model: PersonalProject,
        attributes: ['id', 'title', 'color']
      }],
      order: [['priority', 'DESC']]
    });
    
    const professionalTasksDueToday = await ProfessionalTask.findAll({
      where: {
        assignedToId: req.user.id,
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      include: [
        {
          model: ProfessionalProject,
          attributes: ['id', 'title', 'color']
        }
      ],
      order: [['priority', 'DESC']]
    });
    
    // Overdue tasks
    const personalTasksOverdue = await PersonalTask.findAll({
      where: {
        userId: req.user.id,
        dueDate: {
          [Op.lt]: today
        },
        status: { [Op.notIn]: ['completed', 'cancelled'] }
      },
      include: [{
        model: PersonalProject,
        attributes: ['id', 'title', 'color']
      }],
      order: [['dueDate', 'ASC'], ['priority', 'DESC']]
    });
    
    const professionalTasksOverdue = await ProfessionalTask.findAll({
      where: {
        assignedToId: req.user.id,
        dueDate: {
          [Op.lt]: today
        },
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      include: [
        {
          model: ProfessionalProject,
          attributes: ['id', 'title', 'color']
        }
      ],
      order: [['dueDate', 'ASC'], ['priority', 'DESC']]
    });
    
    // Upcoming high priority tasks (due in next 7 days)
    const personalTasksUpcoming = await PersonalTask.findAll({
      where: {
        userId: req.user.id,
        dueDate: {
          [Op.gte]: tomorrow,
          [Op.lt]: nextWeek
        },
        priority: { [Op.in]: ['high', 'urgent'] },
        status: { [Op.notIn]: ['completed', 'cancelled'] }
      },
      include: [{
        model: PersonalProject,
        attributes: ['id', 'title', 'color']
      }],
      order: [['dueDate', 'ASC']]
    });
    
    const professionalTasksUpcoming = await ProfessionalTask.findAll({
      where: {
        assignedToId: req.user.id,
        dueDate: {
          [Op.gte]: tomorrow,
          [Op.lt]: nextWeek
        },
        priority: { [Op.in]: ['high', 'urgent'] },
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      include: [
        {
          model: ProfessionalProject,
          attributes: ['id', 'title', 'color']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    
    // Task completion statistics
    const totalPersonalTasks = await PersonalTask.count({
      where: { 
        userId: req.user.id,
        createdAt: {
          [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) // First day of current month
        }
      }
    });
    
    const completedPersonalTasks = await PersonalTask.count({
      where: { 
        userId: req.user.id,
        status: 'completed',
        createdAt: {
          [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) // First day of current month
        }
      }
    });
    
    const totalProfessionalTasks = await ProfessionalTask.count({
      where: { 
        assignedToId: req.user.id,
        createdAt: {
          [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) // First day of current month
        }
      }
    });
    
    const completedProfessionalTasks = await ProfessionalTask.count({
      where: { 
        assignedToId: req.user.id,
        status: 'completed',
        createdAt: {
          [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) // First day of current month
        }
      }
    });
    
    // Task status breakdown
    const personalTaskStatusCounts = await PersonalTask.findAll({
      where: { userId: req.user.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    const professionalTaskStatusCounts = await ProfessionalTask.findAll({
      where: { assignedToId: req.user.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    // Recent activities (tasks recently updated)
    const recentPersonalTasks = await PersonalTask.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      include: [{
        model: PersonalProject,
        attributes: ['id', 'title']
      }]
    });
    
    const recentProfessionalTasks = await ProfessionalTask.findAll({
      where: { assignedToId: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      include: [{
        model: ProfessionalProject,
        attributes: ['id', 'title']
      }]
    });
    
    // --- Unified allTasks array ---
    // Fetch all personal tasks
    const allPersonalTasks = await PersonalTask.findAll({
      where: { userId: req.user.id, status: { [Op.notIn]: ['completed', 'cancelled'] } },
      include: [{ model: PersonalProject, attributes: ['id', 'title', 'color'] }]
    });
    // Fetch all professional tasks
    const allProfessionalTasks = await ProfessionalTask.findAll({
      where: { assignedToId: req.user.id, status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] } },
      include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'color'] }]
    });
    // Map and merge tasks
    const mappedPersonal = allPersonalTasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      project: task.PersonalProject ? { id: task.PersonalProject.id, title: task.PersonalProject.title, color: task.PersonalProject.color } : null,
      type: 'personal',
      status: task.status
    }));
    const mappedProfessional = allProfessionalTasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      project: task.ProfessionalProject ? { id: task.ProfessionalProject.id, title: task.ProfessionalProject.title, color: task.ProfessionalProject.color } : null,
      type: 'professional',
      status: task.status
    }));
    // Priority order for sorting
    const priorityOrder = { urgent: 3, high: 2, medium: 1, low: 0 };
    // Sort by dueDate (asc), then by priority (desc)
    const allTasks = [...mappedPersonal, ...mappedProfessional].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
        if (dateDiff !== 0) return dateDiff;
      }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
    
    res.status(200).json({
      success: true,
      data: {
        tasksToday: {
          personal: personalTasksDueToday,
          professional: professionalTasksDueToday,
          total: personalTasksDueToday.length + professionalTasksDueToday.length
        },
        tasksOverdue: {
          personal: personalTasksOverdue,
          professional: professionalTasksOverdue,
          total: personalTasksOverdue.length + professionalTasksOverdue.length
        },
        tasksUpcoming: {
          personal: personalTasksUpcoming,
          professional: professionalTasksUpcoming,
          total: personalTasksUpcoming.length + professionalTasksUpcoming.length
        },
        completionStats: {
          personal: {
            total: totalPersonalTasks,
            completed: completedPersonalTasks,
            completionRate: totalPersonalTasks > 0 ? (completedPersonalTasks / totalPersonalTasks) * 100 : 0
          },
          professional: {
            total: totalProfessionalTasks,
            completed: completedProfessionalTasks,
            completionRate: totalProfessionalTasks > 0 ? (completedProfessionalTasks / totalProfessionalTasks) * 100 : 0
          },
          overall: {
            total: totalPersonalTasks + totalProfessionalTasks,
            completed: completedPersonalTasks + completedProfessionalTasks,
            completionRate: (totalPersonalTasks + totalProfessionalTasks) > 0 
              ? ((completedPersonalTasks + completedProfessionalTasks) / (totalPersonalTasks + totalProfessionalTasks)) * 100 
              : 0
          }
        },
        statusBreakdown: {
          personal: personalTaskStatusCounts,
          professional: professionalTaskStatusCounts
        },
        recentActivity: {
          personal: recentPersonalTasks,
          professional: recentProfessionalTasks
        },
        allTasks
      }
    });
  });
  
  // @desc    Get team dashboard data
  // @route   GET /api/dashboard/team
  // @access  Private
  exports.getTeamDashboard = asyncHandler(async (req, res, next) => {
    // Check if user has a department
    if (!req.user.departmentId) {
      return next(new ErrorResponse('User does not belong to a department', 400));
    }
    
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get department info
    const department = await Department.findByPk(req.user.departmentId);
    
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }
    
    // Get team members
    const teamMembers = await User.findAll({
      where: { departmentId: req.user.departmentId },
      attributes: ['id', 'name', 'email', 'profilePhoto', 'role']
    });
    
    // Get team projects
    const teamProjects = await ProfessionalProject.findAll({
      where: { departmentId: req.user.departmentId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    
    // Get active tasks count by user
    const userActiveTasks = await Promise.all(
      teamMembers.map(async (member) => {
        const taskCount = await ProfessionalTask.count({
          where: {
            assignedToId: member.id,
            status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
          }
        });
        
        const completedCount = await ProfessionalTask.count({
          where: {
            assignedToId: member.id,
            status: 'completed',
            completedAt: {
              [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) // First day of current month
            }
          }
        });
        
        return {
          userId: member.id,
          name: member.name,
          activeTasks: taskCount,
          completedTasks: completedCount
        };
      })
    );
    
    // Get project completion status
    const projectProgress = await Promise.all(
      teamProjects.map(async (project) => {
        const totalTasks = await ProfessionalTask.count({
          where: { projectId: project.id }
        });
        
        const completedTasks = await ProfessionalTask.count({
          where: { 
            projectId: project.id,
            status: 'completed'
          }
        });
        
        const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        return {
          projectId: project.id,
          title: project.title,
          totalTasks,
          completedTasks,
          progressPercent,
          status: project.status,
          dueDate: project.dueDate
        };
      })
    );
    
    // Get overdue tasks for the team
    const overdueTasksByProject = await ProfessionalTask.findAll({
      where: {
        departmentId: req.user.departmentId,
        dueDate: { [Op.lt]: today },
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      include: [
        {
          model: ProfessionalProject,
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      data: {
        department,
        teamSize: teamMembers.length,
        teamMembers,
        teamProjects,
        userActiveTasks,
        projectProgress,
        overdueTasksByProject,
        overdueCount: overdueTasksByProject.length
      }
    });
  });
  
  // @desc    Get productivity statistics
  // @route   GET /api/dashboard/productivity
  // @access  Private
  exports.getProductivityStats = asyncHandler(async (req, res, next) => {
    // Default to current month if not specified
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;
    
    // Get start and end of the selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Personal tasks stats
    const personalCompletedCount = await PersonalTask.count({
      where: {
        userId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Get completion by day of week
    const personalCompletionByDay = await PersonalTask.findAll({
      where: {
        userId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DAYOFWEEK', sequelize.col('completedAt')), 'dayOfWeek'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DAYOFWEEK', sequelize.col('completedAt'))]
    });
    
    // Professional tasks stats
    const professionalCompletedCount = await ProfessionalTask.count({
      where: {
        assignedToId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const professionalCompletionByDay = await ProfessionalTask.findAll({
      where: {
        assignedToId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DAYOFWEEK', sequelize.col('completedAt')), 'dayOfWeek'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DAYOFWEEK', sequelize.col('completedAt'))]
    });
    
    // Calculate on-time completion rate
    const personalOnTimeCount = await PersonalTask.count({
      where: {
        userId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        },
        dueDate: {
          [Op.gte]: sequelize.col('completedAt')
        }
      }
    });
    
    const professionalOnTimeCount = await ProfessionalTask.count({
      where: {
        assignedToId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        },
        dueDate: {
          [Op.gte]: sequelize.col('completedAt')
        }
      }
    });
    
    // Compare with previous month
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    
    const prevEndDate = new Date(endDate);
    prevEndDate.setMonth(prevEndDate.getMonth() - 1);
    
    const prevPersonalCompletedCount = await PersonalTask.count({
      where: {
        userId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [prevStartDate, prevEndDate]
        }
      }
    });
    
    const prevProfessionalCompletedCount = await ProfessionalTask.count({
      where: {
        assignedToId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [prevStartDate, prevEndDate]
        }
      }
    });
    
    // Get priority distribution
    const personalPriorityDistribution = await PersonalTask.findAll({
      where: {
        userId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });
    
    const professionalPriorityDistribution = await ProfessionalTask.findAll({
      where: {
        assignedToId: req.user.id,
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });
    
    res.status(200).json({
      success: true,
      data: {
        period: {
          month: parseInt(month),
          year: parseInt(year),
          startDate,
          endDate
        },
        personal: {
          completedCount: personalCompletedCount,
          completionByDay: personalCompletionByDay,
          onTimeCompletionRate: personalCompletedCount > 0 ? (personalOnTimeCount / personalCompletedCount) * 100 : 0,
          priorityDistribution: personalPriorityDistribution,
          changeFromPrevMonth: prevPersonalCompletedCount > 0 
            ? ((personalCompletedCount - prevPersonalCompletedCount) / prevPersonalCompletedCount) * 100 
            : 0
        },
        professional: {
          completedCount: professionalCompletedCount,
          completionByDay: professionalCompletionByDay,
          onTimeCompletionRate: professionalCompletedCount > 0 ? (professionalOnTimeCount / professionalCompletedCount) * 100 : 0,
          priorityDistribution: professionalPriorityDistribution,
          changeFromPrevMonth: prevProfessionalCompletedCount > 0 
            ? ((professionalCompletedCount - prevProfessionalCompletedCount) / prevProfessionalCompletedCount) * 100 
            : 0
        },
        overall: {
          completedCount: personalCompletedCount + professionalCompletedCount,
          onTimeCompletionRate: (personalCompletedCount + professionalCompletedCount) > 0 
            ? ((personalOnTimeCount + professionalOnTimeCount) / (personalCompletedCount + professionalCompletedCount)) * 100 
            : 0,
          changeFromPrevMonth: (prevPersonalCompletedCount + prevProfessionalCompletedCount) > 0 
            ? (((personalCompletedCount + professionalCompletedCount) - (prevPersonalCompletedCount + prevProfessionalCompletedCount)) / 
                (prevPersonalCompletedCount + prevProfessionalCompletedCount)) * 100 
            : 0
        }
      }
    });
  });
  
  // @desc    Get department productivity statistics (for managers and admins)
  // @route   GET /api/dashboard/department-productivity/:departmentId
  // @access  Private/Admin/Manager
  exports.getDepartmentProductivity = asyncHandler(async (req, res, next) => {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return next(new ErrorResponse('Not authorized to access department productivity stats', 403));
    }
    
    const { departmentId } = req.params;
    
    // Default to current month if not specified
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;
    
    // Get start and end of the selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Verify department exists
    const department = await Department.findByPk(departmentId);
    
    if (!department) {
      return next(new ErrorResponse(`Department not found with id of ${departmentId}`, 404));
    }
    
    // Get all department users
    const departmentUsers = await User.findAll({
      where: { departmentId },
      attributes: ['id', 'name']
    });
    
    const userIds = departmentUsers.map(user => user.id);
    
    // Get tasks assigned to department users
    const taskCompletionByUser = await ProfessionalTask.findAll({
      where: {
        assignedToId: { [Op.in]: userIds },
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'assignedToId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'completedCount']
      ],
      include: [{
        model: User,
        as: 'assignedTo',
        attributes: ['name']
      }],
      group: ['assignedToId']
    });
    
    // Projects progress in department
    const departmentProjects = await ProfessionalProject.findAll({
      where: { departmentId },
      attributes: ['id', 'title', 'status', 'completionRate']
    });
    
    // Calculate department overall stats
    const totalAssignedTasks = await ProfessionalTask.count({
      where: {
        assignedToId: { [Op.in]: userIds },
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const totalCompletedTasks = await ProfessionalTask.count({
      where: {
        assignedToId: { [Op.in]: userIds },
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const onTimeCompletedTasks = await ProfessionalTask.count({
      where: {
        assignedToId: { [Op.in]: userIds },
        status: 'completed',
        completedAt: {
          [Op.between]: [startDate, endDate]
        },
        dueDate: {
          [Op.gte]: sequelize.col('completedAt')
        }
      }
    });
    
    // Get overdue tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = await ProfessionalTask.count({
      where: {
        assignedToId: { [Op.in]: userIds },
        dueDate: { [Op.lt]: today },
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      }
    });
    
    // Get department performance metrics
    const departmentStats = await ProfessionalTask.findAll({
      where: {
        departmentId: departmentId,
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      attributes: [
        'departmentId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTasks'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completedTasks'],
        [sequelize.fn('AVG', sequelize.literal('CASE WHEN status = "completed" THEN TIMESTAMPDIFF(HOUR, createdAt, completedAt) ELSE NULL END')), 'avgCompletionTime'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN dueDate < NOW() AND status NOT IN ("completed", "cancelled", "rejected") THEN 1 ELSE NULL END')), 'overdueTasks']
      ],
      include: [{
        model: Department,
        attributes: ['name', 'color']
      }],
      group: ['departmentId'],
      raw: true
    });

    // Calculate department performance scores
    const departmentPerformance = departmentStats.map(dept => ({
      ...dept,
      completionRate: (dept.completedTasks / dept.totalTasks) * 100,
      onTimeRate: ((dept.totalTasks - dept.overdueTasks) / dept.totalTasks) * 100,
      performanceScore: ((dept.completedTasks / dept.totalTasks) * 0.6 + ((dept.totalTasks - dept.overdueTasks) / dept.totalTasks) * 0.4) * 100
    }));
    
    res.status(200).json({
      success: true,
      data: {
        department,
        period: {
          month: parseInt(month),
          year: parseInt(year),
          startDate,
          endDate
        },
        teamSize: departmentUsers.length,
        taskCompletionByUser,
        departmentProjects,
        totalAssignedTasks,
        totalCompletedTasks,
        completionRate: totalAssignedTasks > 0 ? (totalCompletedTasks / totalAssignedTasks) * 100 : 0,
        onTimeCompletionRate: totalCompletedTasks > 0 ? (onTimeCompletedTasks / totalCompletedTasks) * 100 : 0,
        overdueTasks,
        departmentPerformance
      }
    });
  });