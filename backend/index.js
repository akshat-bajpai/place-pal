require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const initDb = require('./config/initDb');

const app = express();

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

// Initialize Database Schema
initDb();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
