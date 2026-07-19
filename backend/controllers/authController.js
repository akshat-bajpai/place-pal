const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, education } = req.body;

    if (!name || !email || !password) {
        throw new AppError('Name, email, and password are required', 400);
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        throw new AppError('Please provide a valid email address', 400);
    }

    if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
    }

    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
        throw new AppError('User already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
        'INSERT INTO users (name, email, password, education) VALUES ($1, $2, $3, $4)',
        [name, email, hashedPassword, education]
    );

    res.status(201).json({ message: 'User registered successfully' });
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        throw new AppError('Invalid credentials', 400);
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 400);
    }

    const token = jwt.sign({ user: { id: user.id } }, env.jwtSecret, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    // Trigger background Gmail sync after responding so login isn't delayed
    if (user.google_refresh_token) {
        const { syncUserEmails } = require('../services/gmailService');
        syncUserEmails(user.id, user.google_refresh_token).catch((err) =>
            console.error('[Gmail] Login-triggered sync error:', err.message)
        );
    }
});

exports.getProfile = asyncHandler(async (req, res) => {
    const result = await db.query(
        'SELECT id, name, email, education, created_at, google_refresh_token IS NOT NULL AS gmail_connected FROM users WHERE id = $1',
        [req.user.id]
    );
    if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
    }
    res.json(result.rows[0]);
});

exports.triggerGmailSync = asyncHandler(async (req, res) => {
    const userRes = await db.query(
        'SELECT id, google_refresh_token FROM users WHERE id = $1',
        [req.user.id]
    );
    const user = userRes.rows[0];

    if (!user?.google_refresh_token) {
        throw new AppError('Gmail not connected', 400);
    }

    const { syncUserEmails } = require('../services/gmailService');
    syncUserEmails(user.id, user.google_refresh_token).catch((err) =>
        console.error('[Gmail] Manual sync error:', err.message)
    );

    res.json({ message: 'Gmail sync started' });
});
