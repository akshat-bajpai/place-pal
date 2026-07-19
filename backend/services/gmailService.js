const { google } = require('googleapis');
const db = require('../config/db');
const { parseEmail } = require('./emailParser');
const { emitJobUpdate } = require('./socketService');

// Prevents two concurrent syncs for the same user (e.g. cron fires while login sync is running)
const activeSyncs = new Set();

const createOAuthClient = (refreshToken) => {
    const client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
    );
    client.setCredentials({ refresh_token: refreshToken });
    return client;
};

// Recursively walk MIME parts, preferring text/plain over text/html
const extractTextFromParts = (parts) => {
    if (!parts?.length) return '';

    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
            const nested = extractTextFromParts(part.parts);
            if (nested) return nested;
        }
    }

    // Fall back to HTML with tags stripped
    for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
            const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
            return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        if (part.parts) {
            const nested = extractTextFromParts(part.parts);
            if (nested) return nested;
        }
    }

    return '';
};

const extractEmailBody = (payload) => {
    if (payload.parts) return extractTextFromParts(payload.parts);
    if (payload.body?.data) {
        const raw = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        return payload.mimeType === 'text/html'
            ? raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            : raw;
    }
    return '';
};

// Pre-filter at the Gmail API level — dramatically reduces LLM calls and false positives
const buildJobSearchQuery = (lastSyncAt) => {
    // Subtract 1 day for overlap safety; processed_gmail_ids deduplicates repeats
    const cutoff = lastSyncAt > 0 ? lastSyncAt - 86400 : null;
    const timeFilter = cutoff
        ? `after:${cutoff}`
        : 'newer_than:30d';

    const atsDomains = [
        'greenhouse.io', 'lever.co', 'ashbyhq.com', 'workday.com',
        'smartrecruiters.com', 'jobvite.com', 'icims.com', 'taleo.net',
        'bamboohr.com', 'workable.com', 'hackerrank.com', 'hackerearth.com',
        'codility.com', 'karat.com', 'hirepro.com', 'naukri.com',
        'myworkday.com', 'successfactors.com', 'breezy.hr', 'recruitee.com',
    ].join(' OR ');

    const subjectPhrases = [
        '"your application"',
        '"application received"',
        '"application status"',
        '"application update"',
        '"interview"',
        '"job offer"',
        '"offer letter"',
        '"unfortunately"',
        '"not moving forward"',
        '"other candidates"',
        '"online assessment"',
        '"coding challenge"',
        '"technical assessment"',
        '"background check"',
        '"we regret"',
        '"next steps"',
        '"your candidacy"',
    ].join(' OR ');

    return `${timeFilter} (from:(${atsDomains}) OR subject:(${subjectPhrases}))`;
};

const isAlreadyProcessed = async (userId, gmailMessageId) => {
    const res = await db.query(
        'SELECT 1 FROM processed_gmail_ids WHERE user_id = $1 AND gmail_message_id = $2',
        [userId, gmailMessageId]
    );
    return res.rows.length > 0;
};

const markAsProcessed = async (userId, gmailMessageId) => {
    await db.query(
        'INSERT INTO processed_gmail_ids (user_id, gmail_message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, gmailMessageId]
    );
};

// A content-level parse error (malformed AI response) burns a quota unit each
// attempt, so we retry it a bounded number of times before giving up — enough to
// ride out a transient truncation without letting one pathological email drain
// the whole daily quota. (Infra errors are NOT counted here; they retry forever.)
const MAX_PARSE_ATTEMPTS = 5;

const bumpParseAttempt = async (userId, gmailMessageId) => {
    const res = await db.query(
        `INSERT INTO email_parse_attempts (user_id, gmail_message_id, attempts)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, gmail_message_id)
         DO UPDATE SET attempts = email_parse_attempts.attempts + 1, updated_at = CURRENT_TIMESTAMP
         RETURNING attempts`,
        [userId, gmailMessageId]
    );
    return res.rows[0].attempts;
};

const clearParseAttempts = async (userId, gmailMessageId) => {
    await db.query(
        'DELETE FROM email_parse_attempts WHERE user_id = $1 AND gmail_message_id = $2',
        [userId, gmailMessageId]
    );
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const processMessage = async (gmail, msg, userId) => {
    if (await isAlreadyProcessed(userId, msg.id)) return;

    let msgData;
    try {
        msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    } catch (err) {
        console.error(`[Gmail] Failed to fetch message ${msg.id}:`, err.message);
        return;
    }

    const headers = msgData.data.payload.headers;
    const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
    const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
    const text = extractEmailBody(msgData.data.payload);

    // gemini-2.5-flash free tier: 10 RPM → keep under with ~6.5s gap
    await sleep(6500);

    let parsed;
    try {
        parsed = await parseEmail({ subject, from, text });
    } catch (err) {
        if (err.isInfra) {
            // AI temporarily unavailable (quota/rate limit/network/misconfig). NOT
            // this email's fault and doesn't burn quota — leave it unprocessed and
            // retry indefinitely on later syncs, once the AI is back. Never dropped.
            console.warn(`[Gmail] ${err.aiCategory} on ${msg.id}, will retry when AI is back.`);
            return;
        }
        // Content-level error (malformed AI response). Retry a bounded number of
        // times so a real recruitment email is never dropped over a transient
        // glitch, but a permanently-bad one can't drain the daily quota forever.
        const attempts = await bumpParseAttempt(userId, msg.id);
        if (attempts < MAX_PARSE_ATTEMPTS) {
            console.warn(`[Gmail] parse error on ${msg.id} (${err.aiCategory}, attempt ${attempts}/${MAX_PARSE_ATTEMPTS}), will retry.`);
            return;
        }
        console.error(`[Gmail] Giving up on ${msg.id} after ${attempts} attempts (${err.aiCategory}).`);
        await markAsProcessed(userId, msg.id);
        await clearParseAttempts(userId, msg.id);
        return;
    }

    // LLM responded definitively (job email or not) — mark done so we skip on future
    // syncs, and clear any retry counter this email accumulated.
    await markAsProcessed(userId, msg.id);
    await clearParseAttempts(userId, msg.id).catch(() => {});

    if (!parsed) return;

    const { company, role, status } = parsed;
    console.log(`[Gmail] User ${userId}: ${company} — ${role} — ${status}`);

    try {
        const appRes = await db.query(
            `SELECT id, status, role FROM applications
             WHERE user_id = $1 AND company ILIKE $2
             ORDER BY created_at DESC LIMIT 1`,
            [userId, company]
        );

        let updatedApp;

        if (appRes.rows.length > 0) {
            const existing = appRes.rows[0];
            const statusChanged = existing.status !== status;
            const roleImproved = existing.role === 'Unknown Role' && role !== 'Unknown Role';

            if (statusChanged || roleImproved) {
                const res = await db.query(
                    `UPDATE applications
                     SET status = $1,
                         role = CASE WHEN role = 'Unknown Role' THEN $2 ELSE role END,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 RETURNING *`,
                    [status, role, existing.id]
                );
                updatedApp = res.rows[0];
            }
        } else {
            const res = await db.query(
                'INSERT INTO applications (user_id, company, role, status) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, company, role, status]
            );
            updatedApp = res.rows[0];
        }

        if (updatedApp) {
            emitJobUpdate(userId, {
                message: `${updatedApp.company}: status updated to ${updatedApp.status}`,
                application: updatedApp,
            });
        }
    } catch (dbErr) {
        console.error(`[Gmail] DB error for user ${userId}:`, dbErr.message);
    }
};

const syncUserEmails = async (userId, refreshToken) => {
    if (activeSyncs.has(userId)) {
        console.log(`[Gmail] Sync already in progress for user ${userId}, skipping.`);
        return;
    }
    activeSyncs.add(userId);
    try {
        const oauth2Client = createOAuthClient(refreshToken);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const userRes = await db.query(
            'SELECT last_gmail_sync_at FROM users WHERE id = $1',
            [userId]
        );
        const lastSyncAt = Number(userRes.rows[0]?.last_gmail_sync_at) || 0;
        const syncStartTime = Math.floor(Date.now() / 1000);

        console.log(
            `[Gmail] Syncing user ${userId} (last sync: ${lastSyncAt > 0 ? new Date(lastSyncAt * 1000).toISOString() : 'never'})`
        );

        const query = buildJobSearchQuery(lastSyncAt);
        let pageToken = null;
        let totalFetched = 0;

        do {
            const listRes = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 50,
                pageToken: pageToken || undefined,
            });

            const messages = listRes.data.messages || [];
            for (const msg of messages) {
                await processMessage(gmail, msg, userId);
                totalFetched++;
            }

            pageToken = listRes.data.nextPageToken;
            if (totalFetched >= 300) break; // Safety cap per sync cycle
        } while (pageToken);

        // Persist sync checkpoint after successful run
        await db.query('UPDATE users SET last_gmail_sync_at = $1 WHERE id = $2', [syncStartTime, userId]);
        console.log(`[Gmail] Sync done for user ${userId}: checked ${totalFetched} candidate emails.`);
    } catch (err) {
        if (err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired or revoked')) {
            await db.query(
                'UPDATE users SET google_refresh_token = NULL, last_gmail_sync_at = 0 WHERE id = $1',
                [userId]
            );
            console.warn(`[Gmail] Cleared revoked refresh token for user ${userId}.`);
        } else {
            console.error(`[Gmail] Sync error for user ${userId}:`, err.message);
        }
    } finally {
        activeSyncs.delete(userId);
    }
};

// Called by cron and on server start — syncs every connected user
const fetchAndProcessEmails = async () => {
    try {
        const usersRes = await db.query(
            'SELECT id, google_refresh_token FROM users WHERE google_refresh_token IS NOT NULL'
        );
        if (usersRes.rows.length === 0) {
            console.log('[Gmail] No connected users, skipping sync.');
            return;
        }
        console.log(`[Gmail] Starting sync for ${usersRes.rows.length} user(s)...`);
        for (const user of usersRes.rows) {
            await syncUserEmails(user.id, user.google_refresh_token);
        }
    } catch (err) {
        console.error('[Gmail] fetchAndProcessEmails error:', err.message);
    }
};

// Called when user first connects Gmail — resets checkpoint and does a full 30-day scan
const fetchInitialEmails = async (userId, refreshToken) => {
    await db.query('UPDATE users SET last_gmail_sync_at = 0 WHERE id = $1', [userId]);
    console.log(`[Gmail] Initial 30-day sync starting for user ${userId}...`);
    await syncUserEmails(userId, refreshToken);
};

module.exports = { fetchAndProcessEmails, fetchInitialEmails, syncUserEmails };
