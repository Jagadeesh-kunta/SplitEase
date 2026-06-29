const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS so the React frontend can connect
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Make `io` accessible inside route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client joins a "room" named after the group ID so updates only
  // go to people viewing that specific group
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined group room: ${groupId}`);
  });

  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
    console.log(`Socket ${socket.id} left group room: ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'SplitEase API is running' });
});

// Generic error handler (catches anything not handled in routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
