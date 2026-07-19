const db = require('../config/db');
const { discoverJobs } = require('../services/jobSources');
const {
    getResumeText,
    extractProfile,
    prefilterJobs,
    rankJobs,
    generateCoverLetter,
    suggestResumeImprovements,
} = require('../services/jobAI');

// ---- helpers ----

const getOwnedResume = async (userId, resumeId) => {
    const result = await db.query(
        'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
        [resumeId, userId]
    );
    return result.rows[0] || null;
};

const getOwnedMatch = async (userId, matchId) => {
    const result = await db.query(
        'SELECT * FROM job_matches WHERE id = $1 AND user_id = $2',
        [matchId, userId]
    );
    return result.rows[0] || null;
};

// ---- search pipeline ----

// POST /api/jobs/search  { resume_id, interests }
exports.startSearch = async (req, res) => {
    try {
        const { resume_id, interests, target_companies } = req.body;
        if (!resume_id) return res.status(400).json({ message: 'resume_id is required' });

        const resume = await getOwnedResume(req.user.id, resume_id);
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        // Only one running search per user
        const running = await db.query(
            "SELECT id FROM job_searches WHERE user_id = $1 AND status = 'running'",
            [req.user.id]
        );
        if (running.rows.length > 0) {
            return res.status(409).json({ message: 'A search is already running' });
        }

        const inserted = await db.query(
            `INSERT INTO job_searches (user_id, resume_id, interests, target_companies, status) VALUES ($1, $2, $3, $4, 'running') RETURNING *`,
            [req.user.id, resume_id, interests || null, target_companies || null]
        );
        const search = inserted.rows[0];

        res.status(202).json(search);

        // Run the pipeline in the background (same pattern as ATS scoring)
        runSearchPipeline(search, resume).catch(async (err) => {
            console.error('[JobSearch] Pipeline failed:', err);
            // Only show a raw message when we've deliberately made it user-facing
            // (e.g. the daily AI limit); otherwise keep it generic for the UI.
            const message = err?.userFacing
                ? err.message
                : 'Search failed while analyzing jobs. Please try again in a bit.';
            await db.query(
                `UPDATE job_searches SET status = 'error', stats = $1, completed_at = NOW() WHERE id = $2`,
                [JSON.stringify({ error: message }), search.id]
            ).catch(() => {});
        });
    } catch (error) {
        console.error('Error starting job search:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const runSearchPipeline = async (search, resume) => {
    // 1. Read resume + build profile
    const resumeText = await getResumeText(resume.file_path);
    if (!resumeText || resumeText.length < 50) {
        throw new Error('Could not extract text from this resume PDF');
    }

    // Profile extraction is a whole Gemini request; reuse the cached profile when
    // this resume was already profiled against the same interests. Saves ~half the
    // daily quota on re-scans (free tier is only ~1k req/day).
    const currentInterests = search.interests || '';
    let profile;
    if (resume.search_profile && (resume.search_profile_interests || '') === currentInterests) {
        profile = resume.search_profile;
    } else {
        profile = await extractProfile(resumeText, search.interests);
        await db.query(
            'UPDATE resumes SET search_profile = $1, search_profile_interests = $2 WHERE id = $3',
            [JSON.stringify(profile), currentInterests, resume.id]
        ).catch((e) => console.warn('[JobSearch] failed to cache profile:', e.message));
    }

    // 2. Fan out across every job source, incl. company career pages.
    // Target companies = ones the user typed in + ones named in interests/resume.
    const queries = (profile.search_queries || []).slice(0, 6);
    if (queries.length === 0) queries.push(resume.target_role || 'software engineer');
    const userCompanies = (search.target_companies || '').split(',').map(c => c.trim()).filter(Boolean);
    const targetCompanies = [...new Set([...userCompanies, ...(profile.target_companies || [])])];
    const { jobs, sourceStats } = await discoverJobs(queries, targetCompanies);

    // 3. Local shortlist, then LLM ranking
    const shortlist = prefilterJobs(profile, jobs, 45);
    const ranked = await rankJobs(profile, search.interests, shortlist);

    // 4. Replace previous 'new' matches with the fresh batch
    await db.withTransaction(async (client) => {
        await client.query(
            "DELETE FROM job_matches WHERE user_id = $1 AND status = 'new'",
            [search.user_id]
        );
        for (const r of ranked) {
            const job = shortlist[r.index];
            await client.query(
                `INSERT INTO job_matches
                 (user_id, search_id, resume_id, title, company, location, url, source, description, tags, match_score, match_summary)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [
                    search.user_id, search.id, search.resume_id,
                    job.title, job.company, job.location || null, job.url, job.source,
                    job.description || null, JSON.stringify(job.tags || []),
                    Math.max(0, Math.min(100, Math.round(r.match_score || 0))),
                    r.match_summary || null,
                ]
            );
        }
        await client.query(
            `UPDATE job_searches SET status = 'done', stats = $1, completed_at = NOW() WHERE id = $2`,
            [JSON.stringify({
                profile_headline: profile.headline,
                queries,
                target_companies: targetCompanies,
                sources: sourceStats,
                total_found: jobs.length,
                shortlisted: shortlist.length,
                matched: ranked.length,
            }), search.id]
        );
    });
};

// GET /api/jobs/search/latest
exports.getLatestSearch = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM job_searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [req.user.id]
        );
        res.json(result.rows[0] || null);
    } catch (error) {
        console.error('Error fetching latest search:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/jobs
exports.getMatches = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM job_matches WHERE user_id = $1 AND status != 'dismissed'
             ORDER BY match_score DESC NULLS LAST, created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching job matches:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/jobs/:id/dismiss
exports.dismissMatch = async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE job_matches SET status = 'dismissed' WHERE id = $1 AND user_id = $2 RETURNING id`,
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Match not found' });
        res.json({ message: 'Dismissed' });
    } catch (error) {
        console.error('Error dismissing match:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/jobs/:id/cover-letter  { tone, key_points, motivation, extra }
exports.createCoverLetter = async (req, res) => {
    try {
        const match = await getOwnedMatch(req.user.id, req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        const resume = await getOwnedResume(req.user.id, match.resume_id);
        if (!resume) return res.status(404).json({ message: 'The resume used for this search no longer exists' });

        const resumeText = await getResumeText(resume.file_path);
        const tex = await generateCoverLetter(resumeText, match, req.body || {});

        await db.query(
            'UPDATE job_matches SET cover_letter = $1 WHERE id = $2',
            [tex, match.id]
        );
        res.json({ cover_letter: tex });
    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ message: 'Failed to generate the cover letter. Please try again.' });
    }
};

// POST /api/jobs/:id/suggestions
exports.createSuggestions = async (req, res) => {
    try {
        const match = await getOwnedMatch(req.user.id, req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        const resume = await getOwnedResume(req.user.id, match.resume_id);
        if (!resume) return res.status(404).json({ message: 'The resume used for this search no longer exists' });

        const resumeText = await getResumeText(resume.file_path);
        const suggestions = await suggestResumeImprovements(resumeText, match);

        await db.query(
            'UPDATE job_matches SET resume_suggestions = $1 WHERE id = $2',
            [JSON.stringify(suggestions), match.id]
        );
        res.json({ resume_suggestions: suggestions });
    } catch (error) {
        console.error('Error generating resume suggestions:', error);
        res.status(500).json({ message: 'Failed to generate suggestions. Please try again.' });
    }
};

// POST /api/jobs/:id/track — add this opening to the Applied board
exports.trackMatch = async (req, res) => {
    try {
        const match = await getOwnedMatch(req.user.id, req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        const inserted = await db.query(
            `INSERT INTO applications (user_id, company, role, status, link) VALUES ($1, $2, $3, 'Applied', $4) RETURNING *`,
            [req.user.id, match.company, match.title, match.url]
        );
        await db.query(
            `UPDATE job_matches SET status = 'tracked' WHERE id = $1`,
            [match.id]
        );
        res.status(201).json(inserted.rows[0]);
    } catch (error) {
        console.error('Error tracking match:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
