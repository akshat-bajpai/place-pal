require('dotenv').config();
const { google } = require('googleapis');
const db = require('./config/db');
const { parseEmail } = require('./services/emailParser');
const { emitJobUpdate } = require('./services/socketService');

const fetchLatestEmail = async () => {
    try {
        const usersRes = await db.query('SELECT id, google_refresh_token FROM users WHERE google_refresh_token IS NOT NULL AND id = 3');
        if (usersRes.rows.length === 0) return;
        
        const user = usersRes.rows[0];
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5 // Get 5 latest emails regardless of read/unread
        });

        const messages = res.data.messages || [];
        for (const msg of messages) {
            const msgData = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full'
            });

            const payload = msgData.data.payload;
            const headers = payload.headers || [];
            
            const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
            const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
            
            const subject = subjectHeader ? subjectHeader.value : '';
            const from = fromHeader ? fromHeader.value : '';
            
            let text = '';
            if (payload.parts) {
                const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
                if (textPart && textPart.body && textPart.body.data) {
                    text = Buffer.from(textPart.body.data, 'base64').toString('utf8');
                }
            } else if (payload.body && payload.body.data) {
                text = Buffer.from(payload.body.data, 'base64').toString('utf8');
            }

            console.log(`Checking email: ${subject}`);
            const emailContent = { subject, from, text };
            const parsedData = await parseEmail(emailContent);

            if (parsedData) {
                console.log(`Found application:`, parsedData);
                const { company, role, status } = parsedData;

                const existingApp = await db.query(
                    'SELECT id FROM applications WHERE user_id = $1 AND company ILIKE $2',
                    [user.id, company]
                );

                if (existingApp.rows.length > 0) {
                    await db.query(
                        'UPDATE applications SET status = $1, role = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                        [status, role, existingApp.rows[0].id]
                    );
                    emitJobUpdate({ company, status, role });
                } else {
                    await db.query(
                        'INSERT INTO applications (user_id, company, role, status) VALUES ($1, $2, $3, $4)',
                        [user.id, company, role, status]
                    );
                    emitJobUpdate({ company, status, role });
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
};

fetchLatestEmail().then(() => console.log('Done'));
