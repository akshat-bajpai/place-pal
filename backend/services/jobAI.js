const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { classifyAiError, annotateAiError } = require('../utils/aiErrors');

// Per-model free-tier daily quotas are SEPARATE buckets, so we pick per call:
//  - FLASH_LITE (1,000/day): high-volume, per-scan calls (profile, ranking).
//  - FLASH (~20/day): low-volume, per-click calls where quality matters most
//    (cover letters, resume advice).
const FLASH_LITE = 'gemini-2.5-flash-lite';
const FLASH = 'gemini-2.5-flash';

// Matches scoring below this (0-100) are dropped rather than shown — a firm
// quality gate independent of which model did the ranking.
const MIN_MATCH_SCORE = 60;

// gemini spends "thinking" tokens out of the SAME budget as the visible output
// (maxOutputTokens). So the ceiling has to cover thinking + JSON. Ranking is
// reasoning-heavy but emits tiny JSON -> lots of thinking, small body. The
// resume/cover-letter calls emit large JSON -> modest thinking, big body. One
// shared cap can't serve both, so callers pass their own budget (and model).
const getModel = ({ model = FLASH_LITE, maxOutputTokens = 16384, thinkingBudget = -1 } = {}) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({
        model,
        generationConfig: {
            maxOutputTokens,
            responseMimeType: 'application/json',
            // thinkingBudget: -1 = dynamic (let the model decide), 0 = off,
            // or a fixed cap. Whatever it is, maxOutputTokens must leave room
            // for it PLUS the full JSON or the response truncates mid-string.
            thinkingConfig: { thinkingBudget },
        },
    });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const generateJson = async (prompt, { retries = 3, model, maxOutputTokens, thinkingBudget } = {}) => {
    const genModel = getModel({ model, maxOutputTokens, thinkingBudget });
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await genModel.generateContent(prompt);
            let text = result.response.text().trim();
            text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            return JSON.parse(text);
        } catch (err) {
            lastErr = err;
            const { category, retryable } = classifyAiError(err);
            // Only transient categories (rate_limit, overloaded, network, a
            // truncated response) are worth retrying. A daily-quota wall or a
            // config error will just fail again, so stop and report immediately.
            if (attempt < retries && retryable) {
                const backoff = Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 400);
                console.warn(`[jobAI] ${category} Gemini error (attempt ${attempt + 1}/${retries + 1}); retrying in ${backoff}ms`);
                await sleep(backoff);
                continue;
            }
            throw annotateAiError(err);
        }
    }
    throw annotateAiError(lastErr);
};

/** Read the raw text out of a resume PDF stored in /uploads */
exports.getResumeText = async (filePath) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) throw new Error('Resume file not found on disk');
    const data = await pdf(fs.readFileSync(fullPath));
    return (data.text || '').replace(/\s+\n/g, '\n').trim();
};

/**
 * Extract a candidate profile from resume text + free-form interests.
 * The search_queries drive the job-board fan-out.
 */
exports.extractProfile = async (resumeText, interests) => {
    const prompt = `You are a career-search assistant. From the resume below and the candidate's stated interests, build a search profile.

Resume:
${resumeText.slice(0, 7000)}

Candidate's stated interests / preferences:
${interests || 'Not specified — infer from the resume.'}

Output ONLY valid JSON, no markdown or backticks:
{
  "name": "Candidate full name",
  "email": "email if present else null",
  "phone": "phone if present else null",
  "headline": "one-line professional headline",
  "seniority": "Intern|Entry|Mid|Senior",
  "top_skills": ["up to 12 concrete skills/technologies"],
  "target_roles": ["3-5 job titles that fit resume AND interests"],
  "search_queries": ["4-6 short job-board search queries (2-3 words each, e.g. 'react developer', 'machine learning intern')"],
  "target_companies": ["companies explicitly named in the interests or resume that the candidate wants to work at, else []"]
}`;
    return generateJson(prompt);
};

/**
 * Cheap local pre-filter so we only send the most plausible jobs to the LLM.
 */
exports.prefilterJobs = (profile, jobs, keep = 60) => {
    const skillTerms = (profile.top_skills || []).map(s => s.toLowerCase());
    const roleTerms = (profile.target_roles || []).flatMap(r => r.toLowerCase().split(/\s+/)).filter(t => t.length > 2);

    const scored = jobs.map(job => {
        const title = (job.title || '').toLowerCase();
        const body = `${title} ${(job.tags || []).join(' ').toLowerCase()} ${(job.description || '').toLowerCase()}`;
        let score = 0;
        for (const term of roleTerms) if (title.includes(term)) score += 5;
        for (const skill of skillTerms) {
            if (title.includes(skill)) score += 4;
            else if (body.includes(skill)) score += 2;
        }
        return { job, score };
    });

    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, keep)
        .map(s => s.job);
};

/**
 * LLM-rank the shortlisted jobs against the profile.
 * Returns [{ index, match_score, match_summary }] for the best ones.
 */
exports.rankJobs = async (profile, interests, jobs) => {
    if (jobs.length === 0) return [];
    const jobList = jobs.map((j, i) =>
        `[${i}] ${j.title} @ ${j.company} (${j.location || 'n/a'})\n${(j.description || '').slice(0, 350)}`
    ).join('\n\n');

    const prompt = `You are matching a candidate to job openings.

Candidate profile:
- Headline: ${profile.headline}
- Seniority: ${profile.seniority}
- Skills: ${(profile.top_skills || []).join(', ')}
- Target roles: ${(profile.target_roles || []).join(', ')}
- Stated interests: ${interests || 'n/a'}

Openings (referenced by index):
${jobList}

Select the BEST matches (at most 15, only jobs genuinely worth applying to; skip poor fits and roles far above/below the candidate's seniority). Score 0-100 on fit with skills, seniority and interests.

Output ONLY a valid JSON array, no markdown:
[{"index": 0, "match_score": 87, "match_summary": "One sentence on why this is a strong fit."}]`;

    // Ranking is the quality-determining step of job search, so use the stronger
    // FLASH model. Output is tiny (<=15 short objects), so it's cheap on tokens.
    const ranked = await generateJson(prompt, { model: FLASH });
    if (!Array.isArray(ranked)) return [];
    return ranked
        .filter(r => Number.isInteger(r.index) && r.index >= 0 && r.index < jobs.length)
        // Hard quality floor: never surface weak matches, whichever model ranked
        // them. Guards against a lighter model letting mediocre fits through.
        .filter(r => (r.match_score || 0) >= MIN_MATCH_SCORE)
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
};

// ---------------- LaTeX cover letter ----------------

const escapeLatex = (str = '') =>
    String(str)
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([&%$#_{}])/g, '\\$1')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}');

/**
 * Generate a personalized cover letter. Gemini writes the content as JSON;
 * we assemble it into a standard LaTeX letter (article + geometry + parskip)
 * so the output always compiles.
 */
exports.generateCoverLetter = async (resumeText, job, userInputs = {}) => {
    const { tone = 'Professional', key_points = '', motivation = '', extra = '' } = userInputs;

    const prompt = `Write the content of a one-page cover letter for this application.

Job:
Title: ${job.title}
Company: ${job.company}
Description: ${(job.description || '').slice(0, 2500)}

Candidate resume:
${resumeText.slice(0, 6000)}

Candidate's instructions for the letter:
- Tone: ${tone}
- Points they specifically want included: ${key_points || 'none given'}
- Why they want to work at this company: ${motivation || 'infer tastefully from the job description'}
- Extra notes: ${extra || 'none'}

Rules:
- 3 to 4 body paragraphs, ~250-350 words total.
- Ground every claim in the resume; never invent experience.
- Weave in the candidate's requested points naturally.
- No placeholder brackets like [Company] — use real values.
- Plain text only (no markdown, no LaTeX commands).

Output ONLY valid JSON, no markdown:
{
  "candidate_name": "from resume",
  "candidate_email": "from resume or null",
  "candidate_phone": "from resume or null",
  "recipient": "Hiring Manager team line, e.g. 'Hiring Team'",
  "subject": "Application for <role>",
  "paragraphs": ["para1", "para2", "para3"],
  "closing": "Sincerely"
}`;

    // Writing quality matters and this is a low-volume per-click call, so use the
    // stronger FLASH model (its own small daily bucket is plenty for cover letters).
    const c = await generateJson(prompt, { model: FLASH });

    const name = escapeLatex(c.candidate_name || 'Candidate');
    const contactParts = [c.candidate_email, c.candidate_phone].filter(Boolean).map(escapeLatex);
    const paragraphs = (c.paragraphs || []).map(p => escapeLatex(p)).join('\n\n');

    const tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{parskip}
\\usepackage[hidelinks]{hyperref}
\\pagestyle{empty}

\\begin{document}

\\begin{flushright}
    {\\Large \\textbf{${name}}}\\\\[2pt]
    ${contactParts.join(' \\;\\textbullet\\; ') || ''}
\\end{flushright}

\\vspace{1em}
\\today

\\vspace{1em}
${escapeLatex(c.recipient || 'Hiring Team')}\\\\
${escapeLatex(job.company)}

\\vspace{1em}
\\textbf{${escapeLatex(c.subject || `Application for ${job.title}`)}}

\\vspace{0.5em}
Dear ${escapeLatex(c.recipient || 'Hiring Team')},

${paragraphs}

\\vspace{1em}
${escapeLatex(c.closing || 'Sincerely')},\\\\[2em]
${name}

\\end{document}
`;
    return tex;
};

/**
 * Suggest improvements to a specific resume for a specific job.
 */
exports.suggestResumeImprovements = async (resumeText, job) => {
    const prompt = `You are an expert resume coach. Tailor advice for THIS resume applying to THIS job.

Job:
Title: ${job.title}
Company: ${job.company}
Description: ${(job.description || '').slice(0, 3000)}

Resume:
${resumeText.slice(0, 7000)}

Output ONLY valid JSON, no markdown:
{
  "fit_summary": "2 sentences: how well this resume fits this job and the main gap",
  "missing_keywords": ["up to 10 keywords from the job description absent from the resume"],
  "improvements": [{"area": "e.g. Skills section", "suggestion": "specific actionable change for this job"}],
  "bullet_rewrites": [{"original": "an actual weak bullet from the resume", "improved": "rewritten version targeting this job", "reason": "why"}]
}
Include 3-5 improvements and 2-3 bullet_rewrites.`;
    // Nuanced, low-volume per-click call -> use the stronger FLASH model.
    return generateJson(prompt, { model: FLASH });
};
