import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Grid,
  Paper,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import { X, Mail, Calendar, Award, Clock, User, Briefcase } from 'react-feather';
import './UserInfoModal.css';

const getProfilePhotoUrl = (profilePhoto) => {
  if (!profilePhoto) return undefined;
  if (profilePhoto.startsWith('uploads/') || profilePhoto.startsWith('/uploads/')) {
    return `/${profilePhoto.replace(/^\/?/, '')}`;
  }
  return `/uploads/profile/${profilePhoto}`;
};

const UserInfoModal = ({ open, onClose, userData, performanceType }) => {
  if (!userData) return null;

  console.log('UserInfoModal userData:', userData);
  console.log('Profile photo URL:', getProfilePhotoUrl(userData.profilePhoto));

  const getPerformanceColor = (type) => {
    switch (type) {
      case 'mostProductive':
        return 'success';
      case 'leastProductive':
        return 'error';
      case 'mostTasks':
        return 'primary';
      case 'mostRejections':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getPerformanceIcon = (type) => {
    switch (type) {
      case 'mostProductive':
        return <Award size={20} />;
      case 'leastProductive':
        return <Clock size={20} />;
      case 'mostTasks':
        return <User size={20} />;
      case 'mostRejections':
        return <X size={20} />;
      default:
        return <User size={20} />;
    }
  };

  const getPerformanceTitle = (type) => {
    switch (type) {
      case 'mostProductive':
        return 'Most Productive User';
      case 'leastProductive':
        return 'Least Productive User';
      case 'mostTasks':
        return 'User with Most Tasks';
      case 'mostRejections':
        return 'User with Most Rejections';
      default:
        return 'User Information';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      className="user-info-modal"
      PaperProps={{
        style: {
          borderRadius: 12,
          minHeight: 400
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getPerformanceIcon(performanceType)}
          <Typography variant="h6" component="div">
            {getPerformanceTitle(performanceType)}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* User Profile Section */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Avatar
                src={userData.profilePhoto ? `http://localhost:5000/${userData.profilePhoto.replace(/^\/?/, '')}` : '/default-profile.png'}
                alt={userData.name}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 2,
                  fontSize: '2rem',
                  bgcolor: 'primary.main'
                }}
                onError={e => { e.target.onerror = null; e.target.src = '/default-profile.png'; }}
              >
                {userData.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              
              <Typography variant="h6" gutterBottom>
                {userData.name}
              </Typography>
              
              <Chip
                label={userData.projectRole ? userData.projectRole : (userData.role || 'User')}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Mail size={16} />
                <Typography variant="body2" color="text.secondary">
                  {userData.email}
                </Typography>
              </Box>
              
              {userData.department && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Briefcase size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {userData.department}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Performance Metrics Section */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Performance Metrics
              </Typography>
              
              <Grid container spacing={2}>
                {/* Efficiency Ratio */}
                {userData.avgEfficiencyRatio !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Efficiency Ratio
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {userData.avgEfficiencyRatio}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Actual/Estimated Time
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* Task Count */}
                {userData.taskCount !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Total Tasks
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {userData.taskCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assigned Tasks
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* Rejection Count */}
                {userData.rejectionCount !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Rejections
                      </Typography>
                      <Typography variant="h5" color="warning.main" fontWeight="bold">
                        {userData.rejectionCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rejected Tasks
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* Last Login */}
                {userData.lastLogin && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Last Active
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {new Date(userData.lastLogin).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(userData.lastLogin).toLocaleTimeString()}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Performance Highlight */}
              <Box sx={{ mt: 3, p: 2, bgcolor: `${getPerformanceColor(performanceType)}.light`, borderRadius: 1 }}>
                <Typography variant="subtitle2" color={`${getPerformanceColor(performanceType)}.dark`} gutterBottom>
                  Performance Highlight
                </Typography>
                <Typography variant="body2" color={`${getPerformanceColor(performanceType)}.dark`}>
                  {performanceType === 'mostProductive' && 
                    `${userData.name} has the best efficiency ratio, completing tasks faster than estimated.`
                  }
                  {performanceType === 'leastProductive' && 
                    `${userData.name} has a lower efficiency ratio, taking longer than estimated to complete tasks.`
                  }
                  {performanceType === 'mostTasks' && 
                    `${userData.name} has been assigned the most tasks (${userData.taskCount}) in this project.`
                  }
                  {performanceType === 'mostRejections' && 
                    `${userData.name} has the highest number of rejected tasks (${userData.rejectionCount}).`
                  }
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserInfoModal; 