const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');

dotenv.config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const sprintRoutes = require('./routes/sprints');
const developerRoutes = require('./routes/developers');
const analyticsRoutes = require('./routes/analytics');
const githubRoutes = require('./routes/github');
const aiRoutes = require('./routes/ai');
const webhookRoutes = require('./routes/webhooks');
const seedDatabase = require('./utils/seed');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust origins for production
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.on('connection', (socket) => {
  console.log('A client connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Inject io into request objects so routes can trigger events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/github', webhookRoutes); // Mount webhook at /api/github/webhook
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sepm_analyzer';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');

    // Seed database if empty
    const Developer = require('./models/Developer');
    const count = await Developer.countDocuments();
    if (count === 0) {
      console.log('No data found. Skipping mock seeding to keep DB clean for real-time tracking.');
      // await seedDatabase();
    }
  } catch (err) {
    console.log('MongoDB not available, using MongoDB Memory Server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to in-memory MongoDB');
      console.log('Seeding database...');
      await seedDatabase();
    } catch (memErr) {
      console.error('Could not start in-memory MongoDB either:', memErr.message);
      console.log('Please install mongodb-memory-server: npm install mongodb-memory-server');
      process.exit(1);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`Server & WebSocket running on port ${PORT}`);
  });
}

startServer();
