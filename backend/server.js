const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorMiddleware');
const multer = require('multer');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Update this if your frontend runs elsewhere
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

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
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));

// File upload endpoint
app.post('/api/upload', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create the file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      file: {
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed'
    });
  }
});

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Task Management System API' });
});

// Error handler middleware
app.use(errorHandler);

// --- Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Store active user rooms
const activeRooms = new Map();

app.set('io', io);

// Add test endpoint to verify socket connection
app.post('/api/test-socket', (req, res) => {
  const { userId, message } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const roomName = `user_${userId}`;
  console.log(`[DEBUG] Sending test message to room ${roomName}:`, message);
  
  io.to(roomName).emit('test_message', {
    message: message || 'Test message from server',
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: 'Test message sent' });
});

// Add connection logging
io.on('connection', (socket) => {
  console.log('[DEBUG] New socket connection:', socket.id);
  
  // Send immediate test message on connection
  socket.emit('test_message', {
    message: 'Socket connection established',
    timestamp: new Date().toISOString()
  });
  
  socket.on('join', (userId) => {
    try {
      console.log(`[DEBUG] User ${userId} joining room user_${userId}`);
      
      // Leave any existing rooms for this user
      const existingRoom = activeRooms.get(userId);
      if (existingRoom) {
        socket.leave(existingRoom);
        console.log(`[DEBUG] User ${userId} left existing room ${existingRoom}`);
      }
      
      // Join new room
      const roomName = `user_${userId}`;
      socket.join(roomName);
      activeRooms.set(userId, roomName);
      
      console.log(`[DEBUG] User ${userId} joined room ${roomName}`);
      console.log('[DEBUG] Active rooms:', Array.from(activeRooms.entries()));
      
      // Send confirmation to client
      socket.emit('room_joined', { room: roomName });
      
      // Send test message after joining room
      socket.emit('test_message', {
        message: `Successfully joined room ${roomName}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ERROR] Error in join event:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[DEBUG] Socket disconnected:', socket.id, 'Reason:', reason);
    
    // Clean up rooms
    for (const [userId, room] of activeRooms.entries()) {
      if (socket.rooms.has(room)) {
        activeRooms.delete(userId);
        console.log(`[DEBUG] Removed room ${room} for user ${userId}`);
      }
    }
  });

  socket.on('error', (error) => {
    console.error('[ERROR] Socket error:', error);
  });
});

// Add error handling for the server
server.on('error', (error) => {
  console.error('[ERROR] Server error:', error);
});

// Add periodic cleanup of stale rooms
setInterval(() => {
  const now = Date.now();
  for (const [userId, room] of activeRooms.entries()) {
    const sockets = io.sockets.adapter.rooms.get(room);
    if (!sockets || sockets.size === 0) {
      activeRooms.delete(userId);
      console.log(`[DEBUG] Cleaned up stale room ${room} for user ${userId}`);
    }
  }
}, 300000); // Check every 5 minutes

// --- End Socket.IO Setup ---

// Start server
const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Comment out sync for now
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: true });
    //   console.log('Database synced');
    // }
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // For testing purposes