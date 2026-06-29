const { google } = require('googleapis');
const db = require('../config/db');

exports.getGoogleAuthUrl = (req, res) => {
    const userId = req.user.id;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
        prompt: 'consent',
        state: userId.toString(),
    });

    res.json({ url });
};

exports.googleAuthCallback = async (req, res) => {
    const { code, state: userId } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code || !userId) {
        return res.redirect(`${frontendUrl}/profile?gmail_connected=false`);
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            // User already granted access before; no new refresh token issued.
            // Redirect as connected — existing token in DB is still valid.
            return res.redirect(`${frontendUrl}/profile?gmail_connected=true`);
        }

        await db.query(
            'UPDATE users SET google_refresh_token = $1, last_gmail_sync_at = 0 WHERE id = $2',
            [tokens.refresh_token, userId]
        );

        // Kick off initial 30-day sync in the background
        const { fetchInitialEmails } = require('../services/gmailService');
        fetchInitialEmails(userId, tokens.refresh_token).catch(console.error);

        res.redirect(`${frontendUrl}/profile?gmail_connected=true`);
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${frontendUrl}/profile?gmail_connected=false`);
    }
};
