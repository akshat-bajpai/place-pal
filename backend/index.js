require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const initDb = require('./config/initDb');

const { initSocket } = require('./services/socketService');
const { initCronJobs } = require('./services/cronService');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
const applicationRoutes = require('./routes/applicationRoutes');
app.use('/api/applications', applicationRoutes);
const resumeRoutes = require('./routes/resumeRoutes');
app.use('/api/resumes', resumeRoutes);

// Serve static files (Resumes)
app.use('/uploads', express.static('uploads'));

// Initialize Database Schema first, then start cron jobs
initDb().then(() => {
    initCronJobs();
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
