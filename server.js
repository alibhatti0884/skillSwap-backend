require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const initSocket = require('./socket/socketHandler');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const skillsRoutes = require('./routes/skills');
const matchingRoutes = require('./routes/matching');
const swapRoutes = require('./routes/swaps');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// CORS
const corsOptions = {
  origin: true,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Database
connectDB();

// REST Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SkillSwap API'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

initSocket(io);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`SkillSwap server running on port ${PORT}`);
  });
}