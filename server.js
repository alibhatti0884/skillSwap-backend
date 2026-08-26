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

// Accept a comma-separated list of allowed origins in CLIENT_URL, e.g.:
//   CLIENT_URL=http://localhost:5173,http://192.168.1.5:5173
// This is what lets desktop (localhost) AND a phone on the same LAN (IP
// address) both reach the API at the same time — a single fixed origin
// blocks every request from the other one with a CORS error, which the
// browser surfaces to the app as a generic "Network Error" / login failure.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (curl/Postman) with no Origin header, and any
    // origin explicitly listed above.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin} is not in CLIENT_URL`));
    }
  }
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Database ---
// Ensures a MongoDB connection exists before ANY request reaches a route
// handler. Connects once and reuses the cached connection afterward (see
// connectDB in config/db.js). If the connection fails — most commonly
// because MONGO_URI is unset, wrong, or points at localhost from a
// deployment that can't reach it — every request now gets a clear JSON 503
// explaining exactly that, instead of a mysterious crash/500 with no message.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      message:
        'Database connection failed. Check that MONGO_URI is set correctly, and — if using ' +
        'MongoDB Atlas — that Network Access allows connections from anywhere (0.0.0.0/0), ' +
        'since serverless deployments do not have a fixed outgoing IP address.',
      error: err.message
    });
  }
});

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
