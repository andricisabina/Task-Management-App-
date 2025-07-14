import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { BarChart2 } from "react-feather";
import UserInfoModal from '../../components/common/UserInfoModal';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const ProductivityReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [filters, setFilters] = useState({
    scope: 'personal_tasks',
    projectId: '',
    startDate: '',
    endDate: '',
    format: 'json'
  });
  const [userModal, setUserModal] = useState({
    open: false,
    userData: null,
    performanceType: null
  });

  const fetchProjects = async (scope) => {
    try {
      let endpoint = '';
      if (scope === 'personal_project') {
        endpoint = '/projects/personal';
      } else if (scope === 'professional_project') {
        endpoint = '/projects/team';
      } else {
        setProjects([]);
        return;
      }
      const response = await api.get(endpoint);
      console.log('API response for projects:', response);
      // Handle both array and object responses
      const projectData = Array.isArray(response) ? response : (response.data || []);
      setProjects(projectData);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
      setError('Failed to fetch projects');
      toast.error('Failed to fetch projects');
    }
  };

  useEffect(() => {
    // Fetch user role
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        setUserRole(response.data.role);
      } catch (err) {
        setError('Failed to fetch user data');
        toast.error('Failed to fetch user data');
      }
    };
    fetchUserData();
  }, []);

  // Fetch projects whenever scope changes
  useEffect(() => {
    if (filters.scope === 'personal_project' || filters.scope === 'professional_project') {
      fetchProjects(filters.scope);
    } else {
      setProjects([]);
    }
  }, [filters.scope]);

  const handleFilterChange = (field) => (event) => {
    const newValue = event.target.value;
    setFilters(prev => ({
      ...prev,
      [field]: newValue,
      // Reset projectId if scope changes
      ...(field === 'scope' ? { projectId: '' } : {})
    }));
  };

  const handleUserCardClick = (userData, performanceType) => {
    setUserModal({
      open: true,
      userData,
      performanceType
    });
  };

  const handleCloseUserModal = () => {
    setUserModal({
      open: false,
      userData: null,
      performanceType: null
    });
  };

  const isProjectScope = filters.scope === 'personal_project' || filters.scope === 'professional_project';
  const canGenerate = !loading && (!isProjectScope || (((projects || []).length > 0) && filters.projectId));

  const generateReport = async () => {
    if (isProjectScope && !filters.projectId) {
      setError('Please select a project.');
      toast.error('Please select a project.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        scope: filters.scope,
        format: filters.format
      });

      if (filters.projectId) {
        queryParams.append('projectId', filters.projectId);
      }
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate);
      }

      // Set responseType: 'blob' for file formats
      const isFileFormat = filters.format === 'csv' || filters.format === 'excel';
      const response = await api.get(`/reports?${queryParams.toString()}`, {
        responseType: isFileFormat ? 'blob' : 'json'
      });
      
      if (isFileFormat) {
        const contentType = response?.type || response?.headers?.['content-type'] || response?.headers?.get?.('content-type');
        if (contentType && (contentType.includes('text/csv') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
          const blob = new Blob([
            response.data || response
          ], {
            type:
              filters.format === 'csv'
                ? 'text/csv'
                : filters.format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/octet-stream'
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `productivity-report-${filters.scope}.${filters.format === 'excel' ? 'xlsx' : filters.format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast.success('Report generated successfully!');
        } else {
          // Not a valid file, try to parse error
          let errorMsg = 'Failed to generate report';
          try {
            // Try to read error from blob
            const text = await (response.data?.text ? response.data.text() : response.data);
            const errJson = JSON.parse(text);
            errorMsg = errJson.error || errorMsg;
          } catch {}
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        // Handle JSON response
        console.log('Report data received:', response.data || response);
        setReportData(response.data || response);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate report';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderCharts = () => {
    if (!reportData || !reportData.charts) return null;

    const charts = [];

    // Status Distribution Chart
    if (reportData.charts.statusDistribution) {
      charts.push(
        <Grid item xs={12} md={4} key="status">
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Task Status Distribution</Typography>
            <Box sx={{ height: 300 }}>
              <Pie 
                data={reportData.charts.statusDistribution} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      );
    }

    // Priority Distribution Chart
    if (reportData.charts.priorityDistribution) {
      charts.push(
        <Grid item xs={12} md={4} key="priority">
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tasks by Priority</Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={reportData.charts.priorityDistribution} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      );
    }

    // Project Distribution Chart (for personal tasks)
    if (reportData.charts.projectDistribution) {
      charts.push(
        <Grid item xs={12} md={4} key="project">
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tasks per Project</Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={reportData.charts.projectDistribution} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      );
    }

    // Department Distribution Chart (for professional tasks)
    if (reportData.charts.departmentDistribution) {
      charts.push(
        <Grid item xs={12} md={4} key="department">
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tasks per Department</Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={reportData.charts.departmentDistribution} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      );
    }

    // User Distribution Chart
    if (reportData.charts.userDistribution) {
      charts.push(
        <Grid item xs={12} md={4} key="user">
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tasks per User</Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={reportData.charts.userDistribution} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      );
    }

    return (
      <Grid container spacing={3}>
        {charts}
      </Grid>
    );
  };

  return (
    <div className="projects-container" style={{ minHeight: '100vh', background: '#f7f9fb' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart2 size={32} color="#C4DFF5" style={{ verticalAlign: 'middle' }} />
          <h1 className="page-title" style={{ lineHeight: '1', display: 'flex', alignItems: 'center', marginBottom: 0 }}>Productivity Report</h1>
        </div>
      </div>
      
      <div className="card" style={{ marginBottom: 32, padding: 32 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select value={filters.scope} onChange={handleFilterChange('scope')} label="Report Type">
                <MenuItem value="personal_tasks">My Tasks</MenuItem>
                <MenuItem value="personal_project">My Projects</MenuItem>
                <MenuItem value="professional_project">Team Projects</MenuItem>
                {userRole && ['admin', 'project_manager'].includes(userRole) && (
                  <MenuItem value="all_professional">All Professional Projects</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          
          {isProjectScope && (
            <Grid item xs={12} md={4} style={{ minWidth: 220 }}>
              <FormControl fullWidth required variant="outlined" sx={{ background: '#fff' }}>
                <InputLabel>Project</InputLabel>
                <Select
                  value={filters.projectId}
                  onChange={handleFilterChange('projectId')}
                  label="Project"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        minWidth: 220,
                      },
                    },
                  }}
                >
                  {(projects || []).length === 0 && (
                    <MenuItem value="" disabled>No projects found</MenuItem>
                  )}
                  {(projects || []).map(project => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name || project.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} md={isProjectScope ? 2 : 3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={isProjectScope ? 2 : 3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select value={filters.format} onChange={handleFilterChange('format')} label="Export Format">
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="json">Charts & Stats</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={generateReport}
              disabled={!canGenerate}
              style={{ minWidth: 120, height: 48 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Generate'}
            </Button>
          </Grid>
        </Grid>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {reportData && filters.format === 'json' && (
        <>
          {/* KPIs Section */}
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {!['personal_project', 'professional_project'].includes(filters.scope) && (
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Completion Rate
                    </Typography>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {typeof reportData.insights.completionRate === 'number' 
                        ? reportData.insights.completionRate.toFixed(1) 
                        : parseFloat(reportData.insights.completionRate || 0).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Total Tasks
                  </Typography>
                  <Typography variant="h4" color="textPrimary" fontWeight="bold">
                    {reportData.insights.totalTasks || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Completed Tasks
                  </Typography>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {reportData.insights.completedTasks || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Overdue Tasks
                  </Typography>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {reportData.insights.overdueCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Additional KPIs for professional projects */}
            {filters.scope.includes('professional') && (
              <>
                {reportData.insights.rejectedTasks !== undefined && (
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          Rejected Tasks
                        </Typography>
                        <Typography variant="h4" color="error.main" fontWeight="bold">
                          {reportData.insights.rejectedTasks}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {reportData.insights.extensionRequests !== undefined && (
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          Extension Requests
                        </Typography>
                        <Typography variant="h4" color="info.main" fontWeight="bold">
                          {reportData.insights.extensionRequests}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {reportData.insights.highPriorityTasks !== undefined && (
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          High Priority Tasks
                        </Typography>
                        <Typography variant="h4" color="error.main" fontWeight="bold">
                          {reportData.insights.highPriorityTasks}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {reportData.insights.projectCompletionRate !== undefined && (
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          Project Completion Rate
                        </Typography>
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          {typeof reportData.insights.projectCompletionRate === 'number' 
                            ? reportData.insights.projectCompletionRate.toFixed(1) 
                            : parseFloat(reportData.insights.projectCompletionRate || 0).toFixed(1)}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}
          </Grid>

          {/* Performance Highlights Section */}
          {filters.scope.includes('professional') && reportData.insights.performanceHighlights && (
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Performance Highlights
              </Typography>
              <Grid container spacing={3}>
                {reportData.insights.performanceHighlights.mostProductiveDepartment ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle2" color="text.secondary">Most Productive Department</Typography>
                      <Typography variant="body1" fontWeight="bold">{reportData.insights.performanceHighlights.mostProductiveDepartment.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Avg. Efficiency Ratio: {reportData.insights.performanceHighlights.mostProductiveDepartment.avgEfficiencyRatio}</Typography>
                    </Paper>
                  </Grid>
                ) : null}
                {reportData.insights.performanceHighlights.mostProductiveUser ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleUserCardClick(reportData.insights.performanceHighlights.mostProductiveUser, 'mostProductive')}
                    >
                      <Typography variant="subtitle2" color="text.secondary">Most Productive User</Typography>
                      <Typography variant="body1" fontWeight="bold">{reportData.insights.performanceHighlights.mostProductiveUser.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Avg. Efficiency Ratio: {reportData.insights.performanceHighlights.mostProductiveUser.avgEfficiencyRatio}</Typography>
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                        Click to view details
                      </Typography>
                    </Paper>
                  </Grid>
                ) : null}
                {reportData.insights.performanceHighlights.userWithMostTasks ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleUserCardClick(reportData.insights.performanceHighlights.userWithMostTasks, 'mostTasks')}
                    >
                      <Typography variant="subtitle2" color="text.secondary">User with Most Tasks</Typography>
                      <Typography variant="body1" fontWeight="bold">{reportData.insights.performanceHighlights.userWithMostTasks.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{reportData.insights.performanceHighlights.userWithMostTasks.taskCount} tasks</Typography>
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                        Click to view details
                      </Typography>
                    </Paper>
                  </Grid>
                ) : null}
                {reportData.insights.performanceHighlights.leastProductiveUser ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleUserCardClick(reportData.insights.performanceHighlights.leastProductiveUser, 'leastProductive')}
                    >
                      <Typography variant="subtitle2" color="text.secondary">Least Productive User</Typography>
                      <Typography variant="body1" fontWeight="bold">{reportData.insights.performanceHighlights.leastProductiveUser.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Avg. Efficiency Ratio: {reportData.insights.performanceHighlights.leastProductiveUser.avgEfficiencyRatio}</Typography>
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                        Click to view details
                      </Typography>
                    </Paper>
                  </Grid>
                ) : null}
                {reportData.insights.performanceHighlights.userWithMostRejections ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleUserCardClick(reportData.insights.performanceHighlights.userWithMostRejections, 'mostRejections')}
                    >
                      <Typography variant="subtitle2" color="text.secondary">User with Most Rejections</Typography>
                      <Typography variant="body1" fontWeight="bold">{reportData.insights.performanceHighlights.userWithMostRejections.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{reportData.insights.performanceHighlights.userWithMostRejections.rejectionCount} rejections</Typography>
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                        Click to view details
                      </Typography>
                    </Paper>
                  </Grid>
                ) : null}
              </Grid>
            </Paper>
          )}

          {/* Charts Section */}
          <Box sx={{ mt: 4 }}>
            {renderCharts()}
          </Box>

          {/* Project Information for Professional Projects */}
          {filters.scope.includes('professional') && reportData.project && (
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Project Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Project Name: <strong>{reportData.project.title || 'Unknown'}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Status: <strong>{(reportData.project.status || 'unknown').replace('-', ' ').toUpperCase()}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Priority: <strong>{(reportData.project.priority || 'medium').toUpperCase()}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Completion Rate: <strong>
                      {typeof reportData.project.completionRate === 'number' 
                        ? reportData.project.completionRate.toFixed(1) 
                        : parseFloat(reportData.project.completionRate || 0).toFixed(1)}%
                    </strong>
                  </Typography>
                </Grid>
                {reportData.project.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Description: {reportData.project.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Task List Section */}
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Task Details ({reportData.tasks.length} tasks)
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Grid container spacing={2}>
                {reportData.tasks.map((task, index) => (
                  <Grid item xs={12} key={task.id || index}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {task.title}
                            </Typography>
                            {task.description && (
                              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="body2" color="textSecondary">
                              Status: <span style={{ 
                                color: task.status === 'completed' ? 'green' : 
                                       task.status === 'in-progress' ? 'blue' : 
                                       task.status === 'overdue' ? 'red' : 'orange'
                              }}>
                                {task.status.replace('-', ' ').toUpperCase()}
                              </span>
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="body2" color="textSecondary">
                              Priority: <span style={{ 
                                color: task.priority === 'high' ? 'red' : 
                                       task.priority === 'medium' ? 'orange' : 'green'
                              }}>
                                {task.priority.toUpperCase()}
                              </span>
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="body2" color="textSecondary">
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="body2" color="textSecondary">
                              {task.assignedTo || task.User?.name || 'Unassigned'}
                            </Typography>
                          </Grid>
                          
                          {/* Additional fields for professional tasks */}
                          {filters.scope.includes('professional') && (
                            <>
                              {task.assignedBy && (
                                <Grid item xs={6} md={2}>
                                  <Typography variant="body2" color="textSecondary">
                                    Assigned by: {task.assignedBy}
                                  </Typography>
                                </Grid>
                              )}
                              {task.department && (
                                <Grid item xs={6} md={2}>
                                  <Typography variant="body2" color="textSecondary">
                                    Department: {task.department}
                                  </Typography>
                                </Grid>
                              )}
                              {task.extensionStatus && task.extensionStatus !== 'none' && (
                                <Grid item xs={6} md={2}>
                                  <Typography variant="body2" color="textSecondary">
                                    Extension: <span style={{ 
                                      color: task.extensionStatus === 'approved' ? 'green' : 
                                             task.extensionStatus === 'rejected' ? 'red' : 'orange'
                                    }}>
                                      {task.extensionStatus.toUpperCase()}
                                    </span>
                                  </Typography>
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </>
      )}

      {/* User Info Modal */}
      <UserInfoModal
        open={userModal.open}
        onClose={handleCloseUserModal}
        userData={userModal.userData}
        performanceType={userModal.performanceType}
      />
    </div>
  );
};

export default ProductivityReport; 