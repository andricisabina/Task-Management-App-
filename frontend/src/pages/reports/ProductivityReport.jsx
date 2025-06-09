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
    format: 'csv'
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
      setProjects(response);
    } catch (err) {
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
      // Check content type
      let contentType = response?.type || response?.headers?.['content-type'] || response?.headers?.get?.('content-type');
      if (isFileFormat) {
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
    if (!reportData) return null;

    const statusData = {
      labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
      datasets: [{
        data: [
          reportData.insights.completedTasks,
          reportData.tasks.filter(t => t.status === 'in-progress').length,
          reportData.tasks.filter(t => t.status === 'pending' || t.status === 'todo').length,
          reportData.insights.overdueCount
        ],
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
      }]
    };

    const userData = reportData.tasks.reduce((acc, task) => {
      const userName = task.assignedTo?.name || task.User?.name || 'Unassigned';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {});

    const userChartData = {
      labels: Object.keys(userData),
      datasets: [{
        label: 'Tasks per User',
        data: Object.values(userData),
        backgroundColor: '#2196F3'
      }]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Task Status Distribution</Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={statusData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tasks per User</Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={userChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
        {reportData.insights.departmentPerformance && (
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Department Performance</Typography>
              <Typography variant="body1">
                Completion Rate: {reportData.insights.departmentPerformance.completionRate}%
              </Typography>
              <Typography variant="body1">
                Most Active User: {reportData.insights.departmentPerformance.mostActiveUser}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <div className="projects-container" style={{ minHeight: '100vh', background: '#f7f9fb' }}>
      <div className="projects-header" style={{ marginBottom: 32 }}>
        <h1 className="page-title">Productivity Report</h1>
      </div>
      <div className="card" style={{ marginBottom: 32, padding: 32 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Report</InputLabel>
              <Select value={filters.scope} onChange={handleFilterChange('scope')} label="Report">
                <MenuItem value="personal_tasks">My Tasks</MenuItem>
                <MenuItem value="personal_project">My Projects</MenuItem>
                <MenuItem value="professional_project">Team Projects</MenuItem>
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
              {loading ? <CircularProgress size={20} /> : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </div>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      {reportData && (
        <>
          <Grid container spacing={3} style={{ marginBottom: 32 }}>
            <Grid item xs={12} md={3}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>Completion Rate</Typography>
                <Typography variant="h3" color="primary" fontWeight={700}>{reportData.insights.completionRate.toFixed(1)}%</Typography>
              </div>
            </Grid>
            <Grid item xs={12} md={3}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>Overdue Tasks</Typography>
                <Typography variant="h3" color="error" fontWeight={700}>{reportData.insights.overdueCount}</Typography>
              </div>
            </Grid>
            <Grid item xs={12} md={3}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>Average Duration</Typography>
                <Typography variant="h3" color="secondary" fontWeight={700}>{(reportData.insights.averageDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days</Typography>
              </div>
            </Grid>
            <Grid item xs={12} md={3}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>Total Tasks</Typography>
                <Typography variant="h3" color="textPrimary" fontWeight={700}>{reportData.insights.totalTasks}</Typography>
              </div>
            </Grid>
          </Grid>
          {/* Prepare chart data outside JSX to avoid redeclaration errors */}
          {(() => {
            const pieData = {
              labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
              datasets: [{
                data: [
                  reportData.insights.completedTasks,
                  reportData.tasks.filter(t => t.status === 'in_progress').length,
                  reportData.tasks.filter(t => t.status === 'pending').length,
                  reportData.insights.overdueCount
                ],
                backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
              }]
            };
            const isPieEmpty = pieData.datasets[0].data.every(v => v === 0);
            const userData = reportData.tasks.reduce((acc, task) => {
              const userName = task.User?.name || 'Unassigned';
              acc[userName] = (acc[userName] || 0) + 1;
              return acc;
            }, {});
            const barData = {
              labels: Object.keys(userData),
              datasets: [{
                label: 'Tasks per User',
                data: Object.values(userData),
                backgroundColor: '#2196F3'
              }]
            };
            const isBarEmpty = barData.datasets[0].data.length === 0 || barData.datasets[0].data.every(v => v === 0);
            return (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <div className="card" style={{ padding: 24, minHeight: 340, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>Task Status Distribution</Typography>
                    <div style={{ flex: 1, minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPieEmpty ? (
                        <Typography color="textSecondary" align="center">No data to display</Typography>
                      ) : (
                        <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                      )}
                    </div>
                  </div>
                </Grid>
                <Grid item xs={12} md={6}>
                  <div className="card" style={{ padding: 24, minHeight: 340, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>Tasks per User</Typography>
                    <div style={{ flex: 1, minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isBarEmpty ? (
                        <Typography color="textSecondary" align="center">No data to display</Typography>
                      ) : (
                        <Bar data={barData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
                      )}
                    </div>
                  </div>
                </Grid>
              </Grid>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default ProductivityReport; 