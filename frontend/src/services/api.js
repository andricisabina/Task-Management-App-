import axios from 'axios';

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
};

// Dashboard API
export const dashboardApi = {
  getDashboardData: () => api.get('/dashboard/user'),
  getTeamDashboard: () => api.get('/dashboard/team'),
  getDepartmentProductivity: (month, year) => 
    api.get(`/dashboard/department/productivity?month=${month}&year=${year}`),
};

// Error interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || 'An error occurred';
    throw new Error(message);
  }
);

export default api; 