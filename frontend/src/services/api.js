import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.get('/auth/logout'),
  updateDetails: (data) => api.put('/auth/updatedetails', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
};

// Projects API
export const projectsApi = {
  // Personal Projects
  getPersonalProjects: () => api.get('/personal-projects'),
  getPersonalProject: (id) => api.get(`/personal-projects/${id}`),
  createPersonalProject: (data) => api.post('/personal-projects', data),
  updatePersonalProject: (id, data) => api.put(`/personal-projects/${id}`, data),
  deletePersonalProject: (id) => api.delete(`/personal-projects/${id}`),
  getPersonalProjectStats: (id) => api.get(`/personal-projects/${id}/stats`),

  // Professional Projects
  getProfessionalProjects: () => api.get('/professional-projects'),
  getProfessionalProject: (id) => api.get(`/professional-projects/${id}`),
  createProfessionalProject: (data) => api.post('/professional-projects', data),
  updateProfessionalProject: (id, data) => api.put(`/professional-projects/${id}`, data),
  deleteProfessionalProject: (id) => api.delete(`/professional-projects/${id}`),
  getProfessionalProjectStats: (id) => api.get(`/professional-projects/${id}/stats`),

  // Add member to professional project
  addProjectMember: (projectId, data) => api.post(`/professional-projects/${projectId}/members`, data),

  // Project Comments
  addProjectComment: (projectId, data) => api.post(`/professional-projects/${projectId}/comments`, data),
  getProjectComments: (projectId) => api.get(`/professional-projects/${projectId}/comments`),
  editProjectComment: (projectId, commentId, data) => api.put(`/professional-projects/${projectId}/comments/${commentId}`, data),
  deleteProjectComment: (projectId, commentId) => api.delete(`/professional-projects/${projectId}/comments/${commentId}`),
};

// Tasks API
export const tasksApi = {
  // Personal Tasks
  getPersonalTasks: (params) => api.get('/personal-tasks', { params }),
  getPersonalTask: (id) => api.get(`/personal-tasks/${id}`),
  createPersonalTask: (data) => api.post('/personal-tasks', data),
  updatePersonalTask: (id, data) => api.put(`/personal-tasks/${id}`, data),
  deletePersonalTask: (id) => api.delete(`/personal-tasks/${id}`),

  // Professional Tasks
  getProfessionalTasks: () => api.get('/professional-tasks'),
  getProfessionalTask: (id) => api.get(`/professional-tasks/${id}`),
  createProfessionalTask: (data) => api.post('/professional-tasks', data),
  updateProfessionalTask: (id, data) => api.put(`/professional-tasks/${id}`, data),
  deleteProfessionalTask: (id) => api.delete(`/professional-tasks/${id}`),
  acceptProfessionalTask: (id) => api.post(`/professional-tasks/${id}/accept`),
  rejectProfessionalTask: (id, data) => api.post(`/professional-tasks/${id}/reject`, data),
  requestDeadlineExtension: (id, data) => api.post(`/professional-tasks/${id}/request-extension`, data),
  approveDeadlineExtension: (id) => api.post(`/professional-tasks/${id}/approve-extension`),
  rejectDeadlineExtension: (id) => api.post(`/professional-tasks/${id}/reject-extension`),
};

// Dashboard API
export const dashboardApi = {
  getDashboardData: () => api.get('/dashboard/user'),
  getTeamDashboard: () => api.get('/dashboard/team'),
  getDepartmentProductivity: (month, year) => 
    api.get(`/dashboard/department/productivity?month=${month}&year=${year}`),
};

// Departments API
export const departmentsApi = {
  getDepartments: () => api.get('/departments'),
};

// Error interceptor
api.interceptors.response.use(
  (response) => {
    // If the responseType is 'blob', return the raw response
    if (response.config && response.config.responseType === 'blob') {
      return response.data;
    }
    return response.data;
  },
  (error) => {
    // Suppress 404 errors for getProfessionalTask
    if (
      error.response?.status === 404 &&
      error.config?.url?.match(/^\/professional-tasks\/cd+$/) &&
      error.config?.method === 'get'
    ) {
      // Return a recognizable value for not found, without throwing
      return Promise.resolve({ notFound: true });
    }
    // Custom handling for permission errors on professional project deletion
    if (
      error.config?.url?.includes('/professional-projects/') &&
      error.config?.method === 'delete' &&
      error.response?.data?.message &&
      error.response.data.message.toLowerCase().includes('permission')
    ) {
      throw new Error('You have no permissions');
    }
    if (error.response?.status === 401) {
      const message = error.response?.data?.message || '';
      // Only redirect to login for authentication errors
      if (
        message.toLowerCase().includes('not authorized to access this route') ||
        message.toLowerCase().includes('token expired')
      ) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        toast.error(message || 'You are not authorized to perform this action.');
        return Promise.reject(error);
      }
    }
    const message = error.response?.data?.message || error.response?.data?.error || 'An error occurred';
    throw new Error(message);
  }
);

export default api; 