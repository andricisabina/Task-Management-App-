const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/personal-projects', require('./routes/personalProjectRoutes'));
app.use('/api/professional-projects', require('./routes/professionalProjectRoutes'));
app.use('/api/personal-tasks', require('./routes/personalTaskRoutes'));
app.use('/api/professional-tasks', require('./routes/professionalTaskRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/calendar', require('./routes/calendarRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Task Management System API' });
});

// Error handler middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Sync database (in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // For testing purposes