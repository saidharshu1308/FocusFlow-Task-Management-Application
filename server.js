require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const subtaskRoutes = require('./routes/subtaskRoutes');
const focusRoutes = require('./routes/focusRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FocusFlow backend is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mood', analyticsRoutes); // Handles /api/mood mapping

const PORT = process.env.PORT || 5000;

// Test Database Connection and Start Server
db.getConnection()
  .then((connection) => {
    console.log('✅ Connected to MySQL Database successfully.');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 FocusFlow Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MySQL Database:');
    console.error(err.message);
    process.exit(1);
  });