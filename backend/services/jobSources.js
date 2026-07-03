const fetch = require('node-fetch');
const { discoverCareerPageJobs } = require('./careerPages');

const FETCH_TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

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

const stripHtml = (html = '') =>
    html.replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// Every source returns a normalized job:
// { title, company, location, url, source, description, tags: [] }

const fetchRemotive = async (query) => {
    const data = await fetchJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`);
    return (data.jobs || []).map(j => ({
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Remote',
        url: j.url,
        source: 'Remotive',
        description: stripHtml(j.description).slice(0, 4000),
        tags: j.tags || [],
    }));
};

const fetchArbeitnow = async (query) => {
    const data = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`);
    return (data.data || []).map(j => ({
        title: j.title,
        company: j.company_name,
        location: j.location || (j.remote ? 'Remote' : ''),
        url: j.url,
        source: 'Arbeitnow',
        description: stripHtml(j.description).slice(0, 4000),
        tags: j.tags || [],
    }));
};

let remoteOkCache = null; // full board, fetched once per search run
const fetchRemoteOk = async () => {
    if (remoteOkCache) return remoteOkCache;
    const data = await fetchJson('https://remoteok.com/api');
    remoteOkCache = (Array.isArray(data) ? data : [])
        .filter(j => j && j.position && j.company)
        .map(j => ({
            title: j.position,
            company: j.company,
            location: j.location || 'Remote',
            url: j.url,
            source: 'RemoteOK',
            description: stripHtml(j.description || '').slice(0, 4000),
            tags: j.tags || [],
        }));
    return remoteOkCache;
};

const fetchJobicy = async (query) => {
    // Jobicy only accepts single-word tags
    const tag = query.split(/\s+/)[0] || '';
    const data = await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`);
    return (data.jobs || []).map(j => ({
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || 'Remote',
        url: j.url,
        source: 'Jobicy',
        description: stripHtml(j.jobDescription || j.jobExcerpt || '').slice(0, 4000),
        tags: Array.isArray(j.jobIndustry) ? j.jobIndustry : [],
    }));
};

const fetchTheMuse = async (query) => {
    // The Muse has no free-text search; pull recent pages and filter by keyword locally
    const pages = [0, 1];
    const results = await Promise.allSettled(
        pages.map(p => fetchJson(`https://www.themuse.com/api/public/jobs?page=${p}`))
    );
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    const jobs = [];
    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const j of (r.value.results || [])) {
            const text = `${j.name} ${stripHtml(j.contents || '')}`.toLowerCase();
            if (q.some(t => text.includes(t))) {
                jobs.push({
                    title: j.name,
                    company: j.company?.name || 'Unknown',
                    location: (j.locations || []).map(l => l.name).join(', ') || '',
                    url: j.refs?.landing_page,
                    source: 'The Muse',
                    description: stripHtml(j.contents || '').slice(0, 4000),
                    tags: (j.levels || []).map(l => l.name),
                });
            }
        }
    }
    return jobs;
};

// Optional: Adzuna aggregates Indeed/LinkedIn-style listings incl. on-site roles.
// Enabled when ADZUNA_APP_ID + ADZUNA_APP_KEY are set in .env
const fetchAdzuna = async (query) => {
    const { ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY } = process.env;
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
    const country = (ADZUNA_COUNTRY || 'in').toLowerCase();
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
    const data = await fetchJson(url);
    return (data.results || []).map(j => ({
        title: j.title?.replace(/<\/?[^>]+>/g, ''),
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || '',
        url: j.redirect_url,
        source: 'Adzuna',
        description: (j.description || '').slice(0, 4000),
        tags: j.category?.label ? [j.category.label] : [],
    }));
};

// Optional: JSearch (RapidAPI) — pulls from Google for Jobs (LinkedIn, Indeed,
// Glassdoor, company career pages). Enabled when RAPIDAPI_KEY is set in .env
const fetchJSearch = async (query) => {
    const { RAPIDAPI_KEY } = process.env;
    if (!RAPIDAPI_KEY) return [];
    const data = await fetchJson(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1`,
        { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } }
    );
    return (data.data || []).map(j => ({
        title: j.job_title,
        company: j.employer_name,
        location: [j.job_city, j.job_country].filter(Boolean).join(', ') || (j.job_is_remote ? 'Remote' : ''),
        url: j.job_apply_link,
        source: 'JSearch',
        description: (j.job_description || '').slice(0, 4000),
        tags: j.job_employment_type ? [j.job_employment_type] : [],
    }));
};

/**
 * Fan out across every available job source for each search query,
 * dedupe by (title, company), and return the combined pool.
 * Sources: aggregator boards + company career pages (ATS platforms and
 * proprietary portals like Microsoft/Amazon) + optional keyed aggregators.
 * Returns { jobs, sourceStats } where sourceStats maps source -> count.
 */
exports.discoverJobs = async (queries, targetCompanies = []) => {
    remoteOkCache = null;

    const tasks = [];
    for (const q of queries) {
        tasks.push(['Remotive', fetchRemotive(q)]);
        tasks.push(['Arbeitnow', fetchArbeitnow(q)]);
        tasks.push(['Jobicy', fetchJobicy(q)]);
        tasks.push(['The Muse', fetchTheMuse(q)]);
        tasks.push(['Adzuna', fetchAdzuna(q)]);
        tasks.push(['JSearch', fetchJSearch(q)]);
    }
    tasks.push(['Career Pages', discoverCareerPageJobs(queries, targetCompanies)]);
    // RemoteOK is the full board once; filter per query locally
    tasks.push(['RemoteOK', fetchRemoteOk().then(jobs => {
        const terms = queries.join(' ').toLowerCase().split(/\s+/).filter(t => t.length > 2);
        return jobs.filter(j => {
            const text = `${j.title} ${j.tags.join(' ')} ${j.description}`.toLowerCase();
            return terms.some(t => text.includes(t));
        });
    })]);

    const settled = await Promise.allSettled(tasks.map(([, p]) => p));

    const seen = new Set();
    const jobs = [];
    const sourceStats = {};
    settled.forEach((result, i) => {
        const sourceName = tasks[i][0];
        if (result.status !== 'fulfilled') {
            console.error(`[JobSources] ${sourceName} failed:`, result.reason?.message);
            return;
        }
        for (const job of result.value) {
            if (!job.title || !job.url) continue;
            const key = `${job.title}::${job.company}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            jobs.push(job);
            sourceStats[job.source] = (sourceStats[job.source] || 0) + 1;
        }
    });

    return { jobs, sourceStats };
};
