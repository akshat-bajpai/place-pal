const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password, education } = req.body;

        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            'INSERT INTO users (name, email, password, education) VALUES ($1, $2, $3, $4)',
            [name, email, hashedPassword, education]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

        // Trigger background Gmail sync after responding so login isn't delayed
        if (user.google_refresh_token) {
            const { syncUserEmails } = require('../services/gmailService');
            syncUserEmails(user.id, user.google_refresh_token).catch((err) =>
                console.error('[Gmail] Login-triggered sync error:', err.message)
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, education, created_at, google_refresh_token IS NOT NULL AS gmail_connected FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Manual sync trigger — frontend can call this after connecting Gmail or on demand
exports.triggerGmailSync = async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT id, google_refresh_token FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = userRes.rows[0];

        if (!user?.google_refresh_token) {
            return res.status(400).json({ message: 'Gmail not connected' });
        }

        const { syncUserEmails } = require('../services/gmailService');
        syncUserEmails(user.id, user.google_refresh_token).catch((err) =>
            console.error('[Gmail] Manual sync error:', err.message)
        );

        res.json({ message: 'Gmail sync started' });
    } catch (err) {
        console.error('Trigger sync error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
