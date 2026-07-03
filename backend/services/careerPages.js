const fetch = require('node-fetch');

const FETCH_TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_PER_COMPANY = 12;

const fetchJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            ...options,
            headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
};

// Companies whose career pages we always sweep, mapped to the ATS platform
// that hosts their careers site. Wrong/renamed slugs fail harmlessly (404 -> skipped).
const KNOWN_BOARDS = [
    { company: 'Stripe', ats: 'greenhouse', slug: 'stripe' },
    { company: 'Anthropic', ats: 'greenhouse', slug: 'anthropic' },
    { company: 'Databricks', ats: 'greenhouse', slug: 'databricks' },
    { company: 'Figma', ats: 'greenhouse', slug: 'figma' },
    { company: 'Coinbase', ats: 'greenhouse', slug: 'coinbase' },
    { company: 'GitLab', ats: 'greenhouse', slug: 'gitlab' },
    { company: 'Airbnb', ats: 'greenhouse', slug: 'airbnb' },
    { company: 'Robinhood', ats: 'greenhouse', slug: 'robinhood' },
    { company: 'Cloudflare', ats: 'greenhouse', slug: 'cloudflare' },
    { company: 'Dropbox', ats: 'greenhouse', slug: 'dropbox' },
    { company: 'Duolingo', ats: 'greenhouse', slug: 'duolingo' },
    { company: 'Elastic', ats: 'greenhouse', slug: 'elastic' },
    { company: 'Twilio', ats: 'greenhouse', slug: 'twilio' },
    { company: 'Reddit', ats: 'greenhouse', slug: 'reddit' },
    { company: 'Pinterest', ats: 'greenhouse', slug: 'pinterest' },
    { company: 'Instacart', ats: 'greenhouse', slug: 'instacart' },
    { company: 'Lyft', ats: 'greenhouse', slug: 'lyft' },
    { company: 'Vercel', ats: 'greenhouse', slug: 'vercel' },
    { company: 'Palantir', ats: 'lever', slug: 'palantir' },
    { company: 'Spotify', ats: 'lever', slug: 'spotify' },
    { company: 'OpenAI', ats: 'ashby', slug: 'openai' },
    { company: 'Notion', ats: 'ashby', slug: 'notion' },
    { company: 'Linear', ats: 'ashby', slug: 'linear' },
    { company: 'Ramp', ats: 'ashby', slug: 'ramp' },
    { company: 'Replit', ats: 'ashby', slug: 'replit' },
    { company: 'Visa', ats: 'smartrecruiters', slug: 'visa' },
    {
        company: 'NVIDIA', ats: 'workday',
        wd: { host: 'nvidia.wd5.myworkdayjobs.com', tenant: 'nvidia', site: 'NVIDIAExternalCareerSite' },
    },
];

// ---- per-ATS fetchers (all normalize to the shared job shape) ----

const fetchGreenhouseBoard = async (company, slug) => {
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    return (data.jobs || []).map(j => ({
        title: j.title,
        company,
        location: j.location?.name || '',
        url: j.absolute_url,
        source: `${company} Careers`,
        description: '',
        tags: [],
    }));
};

const fetchLeverBoard = async (company, slug) => {
    const data = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=200`);
    return (Array.isArray(data) ? data : []).map(j => ({
        title: j.text,
        company,
        location: j.categories?.location || '',
        url: j.hostedUrl,
        source: `${company} Careers`,
        description: (j.descriptionPlain || '').slice(0, 4000),
        tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
    }));
};

const fetchAshbyBoard = async (company, slug) => {
    const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    return (data.jobs || []).map(j => ({
        title: j.title,
        company,
        location: j.location || '',
        url: j.jobUrl || j.applyUrl,
        source: `${company} Careers`,
        description: '',
        tags: [j.departmentName, j.employmentType].filter(Boolean),
    }));
};

const fetchSmartRecruitersBoard = async (company, slug) => {
    const data = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`);
    return (data.content || []).map(j => ({
        title: j.name,
        company,
        location: [j.location?.city, j.location?.country].filter(Boolean).join(', '),
        url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
        source: `${company} Careers`,
        description: '',
        tags: j.department?.label ? [j.department.label] : [],
    }));
};

const fetchWorkableBoard = async (company, slug) => {
    const data = await fetchJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=false`);
    return (data.jobs || []).map(j => ({
        title: j.title,
        company,
        location: [j.city, j.country].filter(Boolean).join(', '),
        url: j.url || j.shortlink,
        source: `${company} Careers`,
        description: (j.description || '').slice(0, 4000),
        tags: j.department ? [j.department] : [],
    }));
};

const fetchWorkdayBoard = async (company, wd, query) => {
    const data = await fetchJson(
        `https://${wd.host}/wday/cxs/${wd.tenant}/${wd.site}/jobs`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchText: query, limit: 20, offset: 0, appliedFacets: {} }),
        }
    );
    return (data.jobPostings || []).map(j => ({
        title: j.title,
        company,
        location: j.locationsText || '',
        url: `https://${wd.host}/en-US/${wd.site}${j.externalPath}`,
        source: `${company} Careers`,
        description: '',
        tags: [],
    }));
};

// ---- giants with their own proprietary portals ----

const fetchMicrosoft = async (query) => {
    // Microsoft's official careers search API (jobs.careers.microsoft.com backend).
    // Postings like "Microsoft internship 2027" live only here.
    const data = await fetchJson(
        `https://gcsservices.careers.microsoft.com/search/api/v1/search?q=${encodeURIComponent(query)}&l=en_us&pg=1&pgSz=20&flt=true`
    );
    const jobs = data?.operationResult?.result?.jobs || [];
    return jobs.map(j => ({
        title: j.title,
        company: 'Microsoft',
        location: (j.properties?.locations || []).slice(0, 2).join(', '),
        url: `https://jobs.careers.microsoft.com/global/en/job/${j.jobId}`,
        source: 'Microsoft Careers',
        description: (j.properties?.description || '').replace(/<[^>]+>/g, ' ').slice(0, 4000),
        tags: j.properties?.profession ? [j.properties.profession] : [],
    }));
};

const fetchAmazon = async (query) => {
    const data = await fetchJson(
        `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(query)}&result_limit=20&offset=0`
    );
    return (data.jobs || []).map(j => ({
        title: j.title,
        company: 'Amazon', // raw company_name is a legal entity like "Amazon Development Centre Ireland Ltd"
        location: j.normalized_location || j.location || '',
        url: `https://www.amazon.jobs${j.job_path}`,
        source: 'Amazon Careers',
        description: (j.description_short || j.basic_qualifications || '').slice(0, 4000),
        tags: j.job_category ? [j.job_category] : [],
    }));
};

// ---- helpers ----

const buildQueryTerms = (queries) => {
    const stop = new Set(['and', 'the', 'for', 'with', 'remote', 'jobs', 'job']);
    return [...new Set(
        queries.join(' ').toLowerCase().split(/\s+/).filter(t => t.length > 2 && !stop.has(t))
    )];
};

// Score a board-dump title against the query terms. Exact word matches score
// higher than substring hits so "Engineer Intern" beats "Internal Controls".
const titleRelevance = (title, queryTerms) => {
    const lower = title.toLowerCase();
    const words = new Set(lower.split(/[^a-z0-9+#]+/));
    let score = 0;
    for (const t of queryTerms) {
        if (words.has(t)) score += 2;
        else if (lower.includes(t)) score += 1;
    }
    return score;
};

const fetchBoard = (board, query) => {
    switch (board.ats) {
        case 'greenhouse': return fetchGreenhouseBoard(board.company, board.slug);
        case 'lever': return fetchLeverBoard(board.company, board.slug);
        case 'ashby': return fetchAshbyBoard(board.company, board.slug);
        case 'smartrecruiters': return fetchSmartRecruitersBoard(board.company, board.slug);
        case 'workable': return fetchWorkableBoard(board.company, board.slug);
        case 'workday': return fetchWorkdayBoard(board.company, board.wd, query);
        default: return Promise.resolve([]);
    }
};

/**
 * For a company the user named that isn't in KNOWN_BOARDS, probe the common
 * ATS platforms with slug guesses. Whichever responds with jobs wins.
 */
const probeCompany = async (companyName) => {
    const base = companyName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const slugs = [...new Set([base.replace(/\s+/g, ''), base.replace(/\s+/g, '-')])];
    const attempts = [];
    for (const slug of slugs) {
        attempts.push(fetchGreenhouseBoard(companyName, slug));
        attempts.push(fetchLeverBoard(companyName, slug));
        attempts.push(fetchAshbyBoard(companyName, slug));
        attempts.push(fetchSmartRecruitersBoard(companyName, slug));
        attempts.push(fetchWorkableBoard(companyName, slug));
    }
    const settled = await Promise.allSettled(attempts);
    for (const r of settled) {
        if (r.status === 'fulfilled' && r.value.length > 0) return r.value;
    }
    return [];
};

/**
 * Sweep company career pages directly:
 *  - Microsoft & Amazon portals, searched with each profile query
 *  - Every KNOWN_BOARDS company (full board pulled, filtered by query terms)
 *  - Any extra companies the user/profile named (ATS endpoints probed)
 * Returns normalized jobs, capped per company so no single board floods results.
 */
exports.discoverCareerPageJobs = async (queries, targetCompanies = []) => {
    const queryTerms = buildQueryTerms(queries);
    const primaryQuery = queries[0] || 'software engineer';

    const known = new Set(KNOWN_BOARDS.map(b => b.company.toLowerCase()));
    const extraCompanies = [...new Set(
        targetCompanies
            .map(c => String(c).trim())
            .filter(c => c && !known.has(c.toLowerCase())
                && !['microsoft', 'amazon'].includes(c.toLowerCase()))
    )].slice(0, 10);

    const tasks = [
        ...queries.map(q => ['Microsoft Careers', fetchMicrosoft(q)]),
        ...queries.map(q => ['Amazon Careers', fetchAmazon(q)]),
        ...KNOWN_BOARDS.map(b => [`${b.company} Careers`, fetchBoard(b, primaryQuery)]),
        ...extraCompanies.map(c => [`${c} Careers (probe)`, probeCompany(c)]),
    ];

    const settled = await Promise.allSettled(tasks.map(([, p]) => p));

    const byCompany = new Map();
    settled.forEach((result, i) => {
        if (result.status !== 'fulfilled') {
            console.error(`[CareerPages] ${tasks[i][0]} failed:`, result.reason?.message);
            return;
        }
        for (const job of result.value) {
            if (!job.title || !job.url) continue;
            // Query-searched portals (Microsoft/Amazon/Workday) return relevant hits already;
            // full board dumps are scored against the query terms and must hit at least one.
            const preFiltered = job.source === 'Microsoft Careers' || job.source === 'Amazon Careers'
                || job.source.includes('NVIDIA');
            const relevance = preFiltered ? 100 : titleRelevance(job.title, queryTerms);
            if (relevance === 0) continue;
            if (!byCompany.has(job.company)) byCompany.set(job.company, []);
            byCompany.get(job.company).push({ job, relevance });
        }
    });

    // Most relevant postings first within each company, capped so no board floods the pool
    const jobs = [];
    for (const scored of byCompany.values()) {
        scored.sort((a, b) => b.relevance - a.relevance);
        for (const s of scored.slice(0, MAX_PER_COMPANY)) jobs.push(s.job);
    }
    return jobs;
};
