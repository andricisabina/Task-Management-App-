import React, { useState } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
  const [filters, setFilters] = useState({
    type: 'personal',
    id: '',
    startDate: null,
    endDate: null,
    status: '',
    priority: '',
    format: 'csv'
  });

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleDateChange = (field) => (date) => {
    setFilters(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        type: filters.type,
        id: filters.id,
        format: filters.format
      });

      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      if (filters.priority) {
        queryParams.append('priority', filters.priority);
      }

      const response = await fetch(`/api/reports?${queryParams.toString()}`);
      if (!response.ok) {
        // Try to parse error message
        let errorMsg = 'Failed to generate report';
        try {
          const errJson = await response.json();
          errorMsg = errJson.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (filters.format === 'csv' || filters.format === 'excel') {
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.includes('text/csv') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${filters.type}-${filters.id}.${filters.format === 'excel' ? 'xlsx' : filters.format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // Not a valid file, try to parse error
          let errorMsg = 'Failed to generate report';
          try {
            const text = await response.text();
            const errJson = JSON.parse(text);
            errorMsg = errJson.error || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }
      } else {
        // Handle JSON response
        const data = await response.json();
        setReportData(data);
      }
    } catch (err) {
      setError(err.message);
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
          reportData.tasks.filter(t => t.status === 'in_progress').length,
          reportData.tasks.filter(t => t.status === 'pending').length,
          reportData.insights.overdueCount
        ],
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
      }]
    };

    const userData = reportData.tasks.reduce((acc, task) => {
      const userName = task.User?.name || 'Unassigned';
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
      </Grid>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Productivity Report
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={handleFilterChange('type')}
                  label="Report Type"
                >
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                  <MenuItem value="department">Department</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ID"
                value={filters.id}
                onChange={handleFilterChange('id')}
                placeholder="Enter user/project/department ID"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={filters.format}
                  onChange={handleFilterChange('format')}
                  label="Export Format"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="json">Charts & Stats</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={handleDateChange('startDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={handleDateChange('endDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={handleFilterChange('status')}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={handleFilterChange('priority')}
                  label="Priority"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={generateReport}
                disabled={loading || !filters.id}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {reportData && filters.format === 'json' && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Completion Rate</Typography>
                    <Typography variant="h4">
                      {reportData.insights.completionRate.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Overdue Tasks</Typography>
                    <Typography variant="h4">
                      {reportData.insights.overdueCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Average Duration</Typography>
                    <Typography variant="h4">
                      {reportData.insights.averageDuration.toFixed(1)} days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Total Tasks</Typography>
                    <Typography variant="h4">
                      {reportData.insights.totalTasks}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {renderCharts()}
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default ProductivityReport; 