# Database Tables Description - Task Management Application

## Overview
This document provides a comprehensive description of each database table in the Task Management application, including their purpose, structure, and use cases. The application supports both personal and professional task/project management with collaborative features.

---

## 1. Users Table
**Purpose**: Central user management system that stores all user account information and authentication data.

**Description**: The Users table serves as the core entity for user management, storing essential user information including authentication credentials and profile details. Users do not have global roles or department assignments - these are managed at the project level.

**Key Features**:
- Secure password hashing using bcrypt
- Profile photo support
- Account status tracking (active/inactive)
- Last login tracking
- Unique username and email validation

**Use Cases**:
- User authentication and authorization
- Profile management and customization
- User activity monitoring
- Account management and administration
- Project member assignment and management

**Primary Relationships**:
- Creates multiple Personal/Professional Projects
- Assigned to multiple Professional Tasks
- Creates multiple Comments
- Receives multiple Notifications
- Participates in projects through ProjectMembers (with project-specific roles)

**Note**: Roles and department associations are managed at the project level through the ProjectMembers table, not globally at the user level.

---

## 2. Departments Table
**Purpose**: Organizational structure management that defines functional departments within the organization.

**Description**: The Departments table defines the organizational hierarchy and provides a way to categorize projects and project members by functional areas. Departments are associated with projects, not directly with users.

**Key Features**:
- Unique department names
- Descriptive information
- Color coding for visual identification
- Active/inactive status management

**Use Cases**:
- Organizational structure definition
- Project department assignment
- Visual organization in UI (color coding)
- Department-based project organization
- Cross-departmental project collaboration

**Primary Relationships**:
- Associated with Professional Projects through ProjectDepartments
- Referenced in ProjectMembers for department-based project access
- Users are associated with departments only within specific projects

---

## 3. PersonalProjects Table
**Purpose**: Individual project management for personal tasks and goals outside of professional work.

**Description**: The PersonalProjects table allows users to create and manage their own personal projects, providing a structured way to organize personal tasks and goals.

**Key Features**:
- Project lifecycle management (planning, in-progress, completed, etc.)
- Due date tracking
- Color coding for visual organization
- User-specific ownership

**Use Cases**:
- Personal goal setting and tracking
- Individual project planning
- Personal task organization
- Life management and productivity
- Personal milestone tracking

**Primary Relationships**:
- Belongs to one User (owner)
- Has many Personal Tasks

---

## 4. ProfessionalProjects Table
**Purpose**: Collaborative project management for work-related initiatives involving multiple team members.

**Description**: The ProfessionalProjects table manages complex, multi-user projects with advanced features for team collaboration, progress tracking, and organizational integration.

**Key Features**:
- Multi-user collaboration through ProjectMembers
- Department integration
- Priority management
- Completion rate tracking
- Advanced status management
- Color coding for visual organization

**Use Cases**:
- Team project management
- Cross-departmental collaboration
- Project progress monitoring
- Resource allocation and planning
- Professional milestone tracking
- Organizational project portfolio management

**Primary Relationships**:
- Belongs to one User (creator)
- Has many Professional Tasks
- Has many Comments
- Many-to-many with Users through ProjectMembers
- Many-to-many with Departments through ProjectDepartments

---

## 5. PersonalTasks Table
**Purpose**: Individual task management for personal projects and standalone personal activities.

**Description**: The PersonalTasks table manages individual tasks that can be either standalone or part of a personal project, with time tracking and completion management.

**Key Features**:
- Task status management
- Priority levels
- Time estimation and actual time tracking
- Due date management
- Color coding
- Optional project association

**Use Cases**:
- Personal task management
- Individual productivity tracking
- Personal project task breakdown
- Time management and analysis
- Personal goal achievement tracking

**Primary Relationships**:
- Belongs to one User
- Optional association with PersonalProject

---

## 6. ProfessionalTasks Table
**Purpose**: Collaborative task management for professional projects with advanced workflow features.

**Description**: The ProfessionalTasks table manages complex work tasks with features for assignment, review processes, deadline management, and team collaboration.

**Key Features**:
- Advanced status workflow (pending, todo, in-progress, review, completed, etc.)
- Task assignment and delegation
- Deadline extension requests
- Rejection handling with reasons
- Time tracking (estimated vs actual)
- Department association
- Original vs current due date tracking

**Use Cases**:
- Team task assignment and management
- Workflow process management
- Deadline management and extensions
- Quality control through review processes
- Time tracking and productivity analysis
- Department-based task organization

**Primary Relationships**:
- Belongs to one ProfessionalProject
- Assigned to one User
- Assigned by one User
- Has many Comments
- Has many Attachments
- Associated with one Department

---

## 7. Comments Table
**Purpose**: Communication and collaboration system for tasks and projects through threaded discussions.

**Description**: The Comments table enables team communication by allowing users to add comments to both tasks and projects, supporting threaded replies for organized discussions.

**Key Features**:
- Threaded comment system (parent-child relationships)
- Edit tracking
- Association with tasks or projects
- User attribution

**Use Cases**:
- Task-specific discussions
- Project team communication
- Feedback and review processes
- Knowledge sharing
- Issue tracking and resolution
- Team collaboration and coordination

**Primary Relationships**:
- Belongs to one User
- Optional association with ProfessionalTask
- Optional association with ProfessionalProject
- Self-referencing for threaded replies (parentId)

---

## 8. Attachments Table
**Purpose**: File management system for task-related documents and resources.

**Description**: The Attachments table manages file uploads associated with professional tasks, providing a centralized storage system for task-related documents and resources.

**Key Features**:
- File metadata storage (name, size, type)
- File path management
- Upload tracking
- Optional descriptions

**Use Cases**:
- Document sharing and collaboration
- Task resource management
- File version control
- Reference material storage
- Supporting documentation for tasks

**Primary Relationships**:
- Belongs to one ProfessionalTask
- Uploaded by one User

---

## 9. Notifications Table
**Purpose**: Real-time notification system for user engagement and system updates.

**Description**: The Notifications table manages all system notifications, keeping users informed about task assignments, deadlines, comments, and other relevant activities.

**Key Features**:
- Multiple notification types
- Read/unread status tracking
- Related entity linking
- Custom data storage (JSON)
- Frontend navigation links

**Use Cases**:
- Task assignment notifications
- Deadline reminders
- Comment notifications
- Project updates
- System announcements
- Extension request notifications
- Leader invitation notifications

**Primary Relationships**:
- Belongs to one User
- References various entities through relatedId and relatedType

---

## 10. ProjectMembers Table (Junction Table)
**Purpose**: Many-to-many relationship management between users and professional projects with project-specific roles and department associations.

**Description**: The ProjectMembers table manages the complex relationship between users and professional projects, including project-specific roles, invitation status, and department associations within each project.

**Key Features**:
- Project-specific role management (manager, leader, member)
- Invitation workflow management
- Project-specific department association
- Invitation tracking
- Role-based permissions within projects

**Use Cases**:
- Project team management
- Project-specific role-based access control
- Project invitation system
- Department-based project access within projects
- Team member administration per project

**Primary Relationships**:
- Junction table between Users and ProfessionalProjects
- Associated with Department (project-specific)
- Invitation tracking through User (invitedBy)

**Note**: This is where user roles and department associations are actually managed - at the project level, not globally.

---

## 11. ProjectDepartments Table (Junction Table)
**Purpose**: Many-to-many relationship management between departments and professional projects.

**Description**: The ProjectDepartments table manages the association between departments and professional projects, allowing for cross-departmental project collaboration.

**Key Features**:
- Department-project associations
- Leader assignment per department within projects

**Use Cases**:
- Cross-departmental project management
- Department-based project access
- Multi-department collaboration
- Organizational project structure

**Primary Relationships**:
- Junction table between Departments and ProfessionalProjects
- Leader assignment through User (project-specific)

---

## Summary
The database design supports a comprehensive task management system that handles both personal and professional workflows. The system provides:

1. **User Management**: Secure authentication without global role/department assignments
2. **Project-Based Organization**: Roles and departments managed at the project level
3. **Project Management**: Both personal and professional project lifecycle management
4. **Task Management**: Individual and collaborative task handling with advanced workflows
5. **Communication**: Comment system for team collaboration
6. **File Management**: Attachment system for document sharing
7. **Notifications**: Real-time user engagement system
8. **Collaboration**: Multi-user project access with project-specific role-based permissions

**Key Design Principle**: The system follows a project-centric approach where user roles and department associations are contextual to specific projects, providing greater flexibility and security compared to global role assignments.

This architecture enables a complete task management solution suitable for both individual productivity and organizational project management needs. 