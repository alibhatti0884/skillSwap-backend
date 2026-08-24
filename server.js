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

// --- CORS ---
const corsOptions = {
  origin: true,
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Database ---
connectDB();

// --- REST Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SkillSwap API' }));

app.use('/api/auth', authRoutes);          // FR1
app.use('/api/profile', profileRoutes);    // FR2
app.use('/api/skills', skillsRoutes);      // FR3
app.use('/api/matching', matchingRoutes);  // FR5
app.use('/api/swaps', swapRoutes);         // FR6
app.use('/api/messages', messageRoutes);   // FR7 (history)

// --- Socket.io (FR7 real-time) ---
initSocket(io);

// --- 404 handler ---
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SkillSwap server running on port ${PORT}`);
});
