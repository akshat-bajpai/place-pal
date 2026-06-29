const express = require('express');
const router = express.Router();
const { register, login, getProfile, triggerGmailSync } = require('../controllers/authController');
const { getGoogleAuthUrl, googleAuthCallback } = require('../controllers/googleAuthController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);

router.get('/google/url', authMiddleware, getGoogleAuthUrl);
router.get('/google/callback', googleAuthCallback);

// Manual Gmail sync trigger (called after OAuth connect or on-demand from frontend)
router.post('/gmail/sync', authMiddleware, triggerGmailSync);

module.exports = router;
