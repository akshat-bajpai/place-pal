require('dotenv').config();
const { google } = require('googleapis');
const db = require('./config/db');

async function test() {
    const usersRes = await db.query('SELECT id, google_refresh_token FROM users WHERE google_refresh_token IS NOT NULL LIMIT 1');
    if (usersRes.rows.length === 0) {
        console.log("No users with refresh tokens found.");
        return;
    }
    const token = usersRes.rows[0].google_refresh_token;
    console.log("Found token for user", usersRes.rows[0].id);
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ refresh_token: token });
    try {
        const res = await oauth2Client.getAccessToken();
        console.log("Access Token received. Checking token info...");
        
        const tokenInfoRes = await oauth2Client.getTokenInfo(res.token);
        console.log("Token Scopes:", tokenInfoRes.scopes);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test().then(() => process.exit(0));
