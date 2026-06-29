const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_STATUSES = new Set(['Applied', 'Interviewing', 'Offered', 'Rejected']);

const parseEmail = async (email) => {
    const { subject, from, text } = email;
    if (!subject && !text) return null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
        const msg = err.message || '';
        const isTransient = err.status === 429 || err.status === 503
            || msg.includes('429') || msg.includes('503')
            || msg.includes('quota') || msg.includes('high demand');
        if (isTransient) {
            // Throw so the caller can decide NOT to mark this email as processed —
            // it will be retried on the next sync cycle
            throw Object.assign(new Error('LLM transient error'), { isTransient: true });
        }
        if (!(err instanceof SyntaxError)) {
            console.error('[LLM] Parse error:', msg);
        }
        return null;
    }
};

module.exports = { parseEmail };
