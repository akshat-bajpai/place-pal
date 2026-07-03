require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/db');
const initDb = require('./config/initDb');

const { initSocket } = require('./services/socketService');
const { initCronJobs } = require('./services/cronService');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.set('trust proxy', 1); // behind a reverse proxy (Render/Railway/etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Rate limits: general API, stricter for auth (brute force) and AI endpoints (cost)
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
const applicationRoutes = require('./routes/applicationRoutes');
app.use('/api/applications', applicationRoutes);
const resumeRoutes = require('./routes/resumeRoutes');
app.use('/api/resumes', resumeRoutes);
const jobRoutes = require('./routes/jobRoutes');
app.use('/api/jobs', aiLimiter, jobRoutes);

// Serve static files (Resumes)
app.use('/uploads', express.static('uploads'));

// Initialize Database Schema first, then start cron jobs
initDb().then(async () => {
    // Recover job searches orphaned by a restart mid-run
    try {
        await db.query(
            `UPDATE job_searches SET status = 'error',
             stats = '{"error": "Interrupted by a server restart. Please run the search again."}',
             completed_at = NOW()
             WHERE status = 'running'`
        );
    } catch (err) {
        console.error('Failed to clean up orphaned job searches:', err);
    }
    initCronJobs();
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
