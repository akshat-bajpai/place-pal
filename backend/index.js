const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');

const env = require('./config/env');
env.validateEnv();

const initDb = require('./config/initDb');
const { initSocket } = require('./services/socketService');
const { initCronJobs } = require('./services/cronService');

const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: env.allowedOrigins }));

// Rate limits
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', aiLimiter, jobRoutes);

// Health check (for platform probes / uptime monitors)
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Global Error Handler
app.use(errorHandler);

// Initialize Database, then cron, then start server
initDb().then(() => {
    initCronJobs();

    server.listen(env.port, () => {
        console.log(`Server running on port ${env.port}`);
    });
}).catch((err) => {
    console.error('Fatal: database initialization failed, shutting down.', err);
    process.exit(1);
});
