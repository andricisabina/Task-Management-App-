import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Enable sending cookies
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
    // Handle authentication errors
    if (error.response?.status === 401) {
      const message = error.response?.data?.message || '';
      
      // Clear token and redirect to login for specific auth errors
      if (
        message.toLowerCase().includes('not authorized') ||
        message.toLowerCase().includes('token expired') ||
        message.toLowerCase().includes('invalid token') ||
        message.toLowerCase().includes('no token provided')
      ) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        toast.error('Your session has expired. Please log in again.');
      } else {
        toast.error(message || 'You are not authorized to perform this action.');
      }
      return Promise.reject(error);
    }

    // Handle other errors
    const message = error.response?.data?.message || error.response?.data?.error || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api; 