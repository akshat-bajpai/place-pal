const { GoogleGenerativeAI } = require('@google/generative-ai');
const { classifyAiError } = require('../utils/aiErrors');

const VALID_STATUSES = new Set(['Applied', 'Interviewing', 'Offered', 'Rejected']);

const parseEmail = async (email) => {
    const { subject, from, text } = email;
    if (!subject && !text) return null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Runs per-email on a 5-min cron — the app's highest-volume AI call. Use
    // flash-lite (1,000/day free) so it doesn't drain the tiny 2.5-flash bucket
    // that the low-volume quality calls (cover letters, resume tips) rely on.
    // Simple classification, so the lighter model is more than sufficient.
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a strict classifier for job application status emails.

Determine if this email is a direct status update about a job application the recipient has actively submitted.

VALID — return data for EXACTLY these cases:
- "Applied": Company confirms they received the application
- "Interviewing": Invitation to interview, online assessment, coding challenge, or advance to next round
- "Offered": Job offer extended, offer letter, or background check initiated post-offer
- "Rejected": Application declined, not moving forward, or position filled with other candidates

INVALID — return null for ALL of these (even if job-related):
- Job listing newsletters, job recommendations, or "you might like" alerts
- LinkedIn InMail, connection requests, or profile views
- Recruiter cold outreach where you have NOT applied yet
- Job fair, career event, or webinar invitations
- Career tips, salary benchmarks, or industry articles
- Password resets, security alerts, or account notifications
- Referral program invites
- Company newsletters, product announcements, or marketing
- Automated LinkedIn Easy Apply acknowledgements that are clearly bulk/automated with no specific context
- Any email where you are not an identified candidate in an active, named hiring process

Email to classify:
From: ${from}
Subject: ${subject}
Body: ${text.substring(0, 2500)}

Output ONLY valid JSON with no markdown, backticks, or explanation:
{"company": "Exact Company Name", "role": "Exact Job Title", "status": "Applied|Interviewing|Offered|Rejected"}

If INVALID, output only the word:
null`;

    try {
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        // Strip any markdown code fences the model might add
        responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

        if (responseText === 'null' || responseText === '') return null;

        const data = JSON.parse(responseText);
        if (!data?.company || !data?.status) return null;
        if (!VALID_STATUSES.has(data.status)) return null;

        return {
            company: data.company.trim(),
            role: (data.role || 'Unknown Role').trim(),
            status: data.status,
        };
    } catch (err) {
        const { category } = classifyAiError(err);
        // Infra-level failures (rate limit / overload / network / spent daily quota
        // / server misconfig) aren't THIS email's fault — throw so the caller leaves
        // it UNprocessed and retries on a later sync, once the limit clears / quota
        // resets / key is fixed. No email is ever dropped for an AI-side problem.
        // A malformed AI response for one specific email IS skipped, so we don't
        // re-spend the tiny daily quota on it every cron cycle.
        const retryLater = ['rate_limit', 'ai_overloaded', 'network', 'daily_quota', 'config'];
        if (retryLater.includes(category)) {
            console.warn(`[LLM] ${category} — leaving email unprocessed to retry later.`);
            throw Object.assign(new Error(`LLM ${category}`), { isTransient: true, aiCategory: category });
        }
        if (category !== 'bad_response') console.error('[LLM] Parse error:', err.message || '');
        return null;
    }
};

module.exports = { parseEmail };
