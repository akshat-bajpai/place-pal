# PlacePal — AI-Powered Job Application Tracker & Discovery Platform

PlacePal is a full-stack web app that helps students and job-seekers **manage their entire job hunt in one place**. It does four big things:

1. **Tracks applications** on a drag-and-drop Kanban board (Applied → Interviewing → Offered → Rejected).
2. **Auto-updates that board from your Gmail** — it reads your inbox, uses an LLM to detect "we received your application" / "you're invited to interview" / "unfortunately…" emails, and moves the right card automatically.
3. **Scores your resume** for ATS (Applicant Tracking System) friendliness using a hybrid rules-engine + Gemini AI pipeline.
4. **Finds jobs for you** — an AI reads your resume, fans out across ~10 job boards *and* company career pages (Greenhouse, Lever, Ashby, Workday, Microsoft, Amazon…), ranks the openings against your profile, and generates tailored cover letters and resume-improvement tips.

> This README is written to be **interview-ready**: it explains not just *what* the code does, but *why* each technology and architectural decision was made, and walks through every major logic flow end-to-end.

---

## Table of Contents

1. [The 60-Second Pitch](#the-60-second-pitch)
2. [Tech Stack & Why Each Piece Was Chosen](#tech-stack--why-each-piece-was-chosen)
3. [High-Level Architecture](#high-level-architecture)
4. [Repository Layout](#repository-layout)
5. [Data Model (Postgres Schema)](#data-model-postgres-schema)
6. [Backend Deep Dive](#backend-deep-dive)
7. [The Four Core Feature Flows](#the-four-core-feature-flows)
   - [A. Auth (register / login / JWT)](#a-auth--register--login--jwt)
   - [B. Application Tracking (Kanban)](#b-application-tracking-kanban)
   - [C. Gmail Auto-Sync (the "magic" feature)](#c-gmail-auto-sync-the-magic-feature)
   - [D. Resume Vault + ATS Scoring](#d-resume-vault--ats-scoring)
   - [E. AI Job Finder](#e-ai-job-finder)
8. [Frontend Deep Dive](#frontend-deep-dive)
9. [Key Architectural Decisions & Trade-offs](#key-architectural-decisions--trade-offs)
10. [Security](#security)
11. [Running Locally](#running-locally)
12. [Deployment](#deployment)
13. [Environment Variables](#environment-variables)
14. [Interview Cheat-Sheet](#interview-cheat-sheet--likely-questions--answers)

---

## The 60-Second Pitch

> "PlacePal is a MERN-style full-stack app — React frontend, Express/Node backend, PostgreSQL database — that automates job-hunt admin. The headline feature is **Gmail-driven auto-tracking**: I connect my Gmail via OAuth, a cron job polls my inbox every 5 minutes, and Google's Gemini LLM classifies each email into an application status and updates a Kanban board in real time over WebSockets. On top of that it has an AI job-discovery engine that reads your resume PDF, searches ~10 job boards plus company ATS APIs directly, and uses a two-stage ranking (cheap local filter, then LLM ranking) to surface the best matches, complete with generated LaTeX cover letters. There's also a hybrid ATS resume scorer that combines a deterministic Python rules engine with an AI content-quality score."

---

## Tech Stack & Why Each Piece Was Chosen

### Frontend

| Technology | What it does | **Why this choice** |
|---|---|---|
| **React 19** | UI library | Component model fits a dashboard with lots of independent, stateful widgets (Kanban columns, modals, cards). Industry standard, huge ecosystem. |
| **Vite 8** | Build tool / dev server | Near-instant hot-module-reload in dev and fast production bundling. Replaced Create-React-App (which is deprecated). Uses native ES modules. |
| **React Router 7** | Client-side routing | SPA navigation without full page reloads; supports nested/protected routes (the dashboard layout wraps all authed pages). |
| **Axios** | HTTP client | Cleaner API than `fetch` (interceptors, automatic JSON, easy header injection for the JWT). |
| **Socket.IO client** | Real-time updates | When the backend detects a status-change email, it pushes a toast + live board update without the user refreshing. |
| **Framer Motion** | Animations | Smooth card transitions, modal enter/exit, the collapsing sidebar. Polished feel with minimal code. |
| **@dnd-kit** | Drag-and-drop | Powers the Kanban board — drag a card from "Applied" to "Interviewing". Modern, accessible, more maintainable than react-beautiful-dnd. |
| **lucide-react / react-icons** | Icon sets | Lightweight, tree-shakeable SVG icons. |
| **react-type-animation** | Typewriter effect | Marketing flourish on the landing page. |

### Backend

| Technology | What it does | **Why this choice** |
|---|---|---|
| **Node.js + Express 5** | HTTP server / API | JavaScript everywhere (same language as frontend). Express is minimal and unopinionated — easy to layer middleware (auth, rate limiting, error handling). |
| **PostgreSQL** (via `pg`) | Relational database | The data is **highly relational** (users → applications → resumes → job_matches, all with foreign keys and cascade deletes). Postgres also gives us **JSONB** columns for semi-structured AI output (ATS feedback, match scores) — best of both SQL and NoSQL worlds. |
| **Socket.IO** | WebSockets | Bidirectional real-time push for live application updates. Falls back to polling if WebSockets are blocked. |
| **JWT (`jsonwebtoken`)** | Stateless auth | No server-side session store needed; the token carries the user id, signed with a secret. Scales horizontally. |
| **bcryptjs** | Password hashing | Salted, slow hashing so leaked DB rows can't be reversed into passwords. |
| **Multer** | File uploads | Handles multipart/form-data for resume PDF uploads; writes to local disk with a unique filename. |
| **node-cron** | Scheduled jobs | Runs the Gmail sync every 5 minutes. |
| **googleapis** | Gmail + OAuth | Official Google SDK for the OAuth2 flow and reading Gmail messages. |
| **@google/generative-ai** | Gemini LLM | Powers email classification, job ranking, cover letters, resume suggestions. Gemini 2.5 Flash is cheap/fast with a generous free tier. |
| **pdf-parse** | PDF text extraction | Pulls raw text out of uploaded resume PDFs so the AI can read them. |
| **node-fetch** | HTTP requests | Calls the external job-board APIs. |
| **helmet** | Security headers | Sets sane HTTP security headers (XSS, clickjacking protections). |
| **express-rate-limit** | Rate limiting | Prevents abuse — tighter limits on auth and expensive AI endpoints. |
| **cors** | Cross-origin control | Locks the API to only the known frontend origin(s). |
| **Python 3 (stdlib)** | ATS rules engine | `utils/ats_optimizer.py` does deterministic resume analysis (section detection, action-verb ratio, quantified-achievement detection). Python's text-processing is ergonomic; kept stdlib-only so no pip install is needed at runtime. |

### Why this overall stack?

- **One language (JS) across the stack** → lower context-switching, shared mental model, easy to hire for.
- **Postgres over MongoDB** → the domain is relational (a user *has many* applications, resumes, matches; deleting a user should cascade). JSONB columns cover the few semi-structured fields, so we didn't need a separate document store.
- **Gemini over OpenAI** → generous free tier for a student project, fast "Flash" model, good structured-JSON output.
- **A separate Python script for ATS rules** → the rule-based scoring is pure text analysis; Python expresses it cleanly, and shelling out keeps it decoupled from the Node app.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React SPA)                          │
│  Landing · Login/Register · Dashboard(Kanban) · Resumes · JobFinder   │
│         │  axios (JWT in Authorization header)   ▲ socket.io          │
└─────────┼──────────────────────────────────────┼─────────────────────┘
          │ REST /api/*                           │ real-time job_update
          ▼                                        │
┌──────────────────────────────────────────────────────────────────────┐
│                    EXPRESS API (Node, always-on)                      │
│                                                                        │
│  Middleware:  helmet → json → cors → rate-limit → JWT auth → routes   │
│                                                                        │
│  Routes → Controllers → Services                                       │
│   ┌───────────┬────────────┬───────────┬──────────────────────────┐   │
│   │ auth      │ application│ resume    │ job                      │   │
│   └───────────┴────────────┴───────────┴──────────────────────────┘   │
│                                                                        │
│  Services:                                                             │
│   • gmailService  ── OAuth + fetch inbox ──► emailParser (Gemini)      │
│   • cronService   ── every 5 min ──► gmailService                      │
│   • jobSources    ── fan-out to job boards + careerPages              │
│   • jobAI         ── Gemini: profile, rank, cover letter, suggestions │
│   • socketService ── push updates to the right user's room            │
│   • atsScorer     ── spawn python3 ats_optimizer.py                    │
└───────┬───────────────────────┬──────────────────────┬───────────────┘
        │                       │                      │
        ▼                       ▼                      ▼
  ┌───────────┐         ┌────────────────┐     ┌──────────────────┐
  │ PostgreSQL│         │  Google APIs   │     │ External job APIs│
  │ (pg Pool) │         │  Gmail·Gemini  │     │ Remotive, Lever, │
  └───────────┘         │  OAuth         │     │ Greenhouse, MS…  │
        ▲               └────────────────┘     └──────────────────┘
        │
  ┌───────────────┐
  │ /uploads (PDF)│  ← resume files on disk (persistent volume in prod)
  └───────────────┘
```

**Key point for interviews:** the backend is **stateful and always-on** (not serverless). It runs background cron jobs, holds WebSocket connections, and spawns a Python child process — none of which work on a request-scoped serverless platform.

---

## Repository Layout

```
place-pal/
├── DEPLOY.md                  # Deployment runbook
├── backend/
│   ├── index.js               # App entry: middleware, routes, boot sequence
│   ├── Dockerfile             # Node 20 + Python 3 image
│   ├── config/
│   │   ├── env.js             # Centralized env-var parsing
│   │   ├── db.js              # pg Pool + withTransaction() helper
│   │   └── initDb.js          # CREATE TABLE + auto-migrations on boot
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification → req.user
│   │   └── errorHandler.js    # Global error responder
│   ├── utils/
│   │   ├── AppError.js        # Operational error class (statusCode + message)
│   │   ├── asyncHandler.js    # Wraps async controllers → forwards errors to next()
│   │   ├── atsScorer.js       # Spawns the Python ATS script
│   │   └── ats_optimizer.py   # Hybrid rules + Gemini resume scorer (stdlib Python)
│   ├── controllers/           # Request handlers (the "what to do")
│   │   ├── authController.js
│   │   ├── googleAuthController.js
│   │   ├── applicationController.js
│   │   ├── resumeController.js
│   │   └── jobController.js
│   ├── routes/                # URL → controller wiring
│   │   ├── authRoutes.js
│   │   ├── applicationRoutes.js
│   │   ├── resumeRoutes.js
│   │   └── jobRoutes.js
│   ├── services/              # Business logic / integrations (the "how")
│   │   ├── gmailService.js    # Gmail sync engine
│   │   ├── emailParser.js     # Gemini email classifier
│   │   ├── cronService.js     # node-cron scheduler
│   │   ├── socketService.js   # Socket.IO rooms + emit
│   │   ├── jobSources.js      # Aggregator job-board fetchers
│   │   ├── careerPages.js     # Company ATS/career-page fetchers
│   │   └── jobAI.js           # Gemini: profile/rank/cover-letter/suggestions
│   └── uploads/               # Uploaded resume PDFs (gitignored)
└── frontend/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx           # React root
        ├── App.jsx            # Router + route definitions
        ├── api/               # Axios wrappers per resource
        │   ├── applications.js
        │   ├── resumes.js
        │   └── jobs.js
        ├── components/        # Reusable UI (Navbar, Sidebar, cards, modals, toast)
        └── pages/             # Route screens
            ├── LandingPage.jsx
            ├── LoginPage.jsx / RegisterPage.jsx
            ├── Dashboard.jsx        # Kanban board
            ├── ApplicationList.jsx  # Per-status list view
            ├── Resumes.jsx          # Resume vault + ATS
            ├── JobFinder.jsx        # AI job discovery
            └── ProfilePage.jsx      # Profile + Gmail connect
```

**The controller/service/route split is deliberate:**
- **Routes** = URL-to-handler wiring + route-level middleware.
- **Controllers** = HTTP concerns (read `req`, validate, send `res`).
- **Services** = reusable business logic and third-party integrations (called by multiple controllers *and* by cron).

---

## Data Model (Postgres Schema)

All tables are created idempotently in `config/initDb.js` on every boot (`CREATE TABLE IF NOT EXISTS`), followed by a list of `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` **auto-migrations** so a running DB can evolve without a manual migration tool.

```
users
├── id, name, email (unique), password (bcrypt hash)
├── education (JSONB)
├── google_refresh_token (TEXT)      ← Gmail OAuth token
└── last_gmail_sync_at (BIGINT)      ← unix-seconds checkpoint

applications                          ← the Kanban cards
├── id, user_id → users(id) ON DELETE CASCADE
├── company, role
├── status ('Applied'|'Interviewing'|'Offered'|'Rejected')
├── link (TEXT)
└── created_at, updated_at

resumes                               ← the Resume Vault
├── id, user_id → users(id) CASCADE
├── version_name, file_path, is_starred
├── target_role, academic_year       ← used as the "JD" for ATS scoring
├── ats_score (INT)                  ← -1 = pending, 0 = failed, 1-100 = score
└── ats_feedback (JSONB)             ← full AI + rules breakdown

processed_gmail_ids                   ← dedupe table (idempotent email processing)
├── user_id → users(id) CASCADE
├── gmail_message_id
└── PRIMARY KEY (user_id, gmail_message_id)

job_searches                          ← one row per Job-Finder run
├── id, user_id CASCADE, resume_id → resumes(id) ON DELETE SET NULL
├── interests, target_companies (TEXT)
├── status ('running'|'done'|'error')
├── stats (JSONB)                    ← sources hit, counts, queries
└── created_at, completed_at

job_matches                           ← the discovered/ranked openings
├── id, user_id CASCADE, search_id, resume_id
├── title, company, location, url, source, description, tags (JSONB)
├── match_score (INT), match_summary (TEXT)   ← from the LLM ranker
├── resume_suggestions (JSONB), cover_letter (TEXT)  ← generated on demand
└── status ('new'|'dismissed'|'tracked')
```

**Design notes:**
- **`ON DELETE CASCADE`** on `user_id` everywhere → deleting a user cleanly removes all their data.
- **`ON DELETE SET NULL`** on `resume_id` in searches/matches → deleting a resume doesn't wipe your past matches, it just unlinks them.
- **JSONB** for AI output → the shape of `ats_feedback` / `resume_suggestions` / `stats` is fluid; JSONB lets us store it without rigid columns while still being queryable.
- **Sentinel values** for `ats_score`: `-1` = "still calculating" (drives frontend polling), `0` = "failed", `1–100` = real score.

---

## Backend Deep Dive

### Boot sequence (`index.js`)

```js
1. Create Express app + raw http.Server (needed so Socket.IO can attach).
2. initSocket(server)                     // attach WebSocket server
3. Middleware chain:
   trust proxy → helmet → express.json(1mb) → cors(allowedOrigins)
4. Rate limiters:
   /api        → 600 req / 15 min (general)
   /api/auth   →  30 req / 15 min (brute-force protection)
   /api/jobs   →  60 req / 60 min (expensive AI endpoints)
5. Mount routes (auth, applications, resumes, jobs) + static /uploads
6. Global errorHandler (last)
7. initDb()  →  then initCronJobs()  →  then server.listen()
```

The **order matters**: DB tables must exist before cron kicks off (cron immediately runs a Gmail sync that writes to the DB), and cron/server only start *after* the DB promise resolves.

### Config (`config/env.js`)
All `process.env` access is funneled through one module that provides defaults and parses `ALLOWED_ORIGINS` into an array. This centralization means no scattered `process.env.X` reads and one place to see every config knob.

### Database layer (`config/db.js`)
- Uses a **connection Pool** (not single connections) so concurrent requests don't queue on one socket.
- **Auto-detects SSL**: managed Postgres (Render/Neon/Supabase) needs SSL; localhost doesn't. It regex-checks the connection string, overridable via `DATABASE_SSL`.
- Exposes a **`withTransaction(fn)`** helper that grabs one dedicated client and wraps `BEGIN/COMMIT/ROLLBACK`. The comment explains the subtle bug it avoids: running `BEGIN` through the pool is unsafe because each `pool.query()` may land on a *different* pooled connection, so the statements wouldn't actually be in the same transaction. Used by "star a resume" (unstar all + star one atomically) and the job-match replacement.

### Error handling pattern
- **`AppError`** — a custom `Error` subclass carrying an HTTP `statusCode` and a `fail`/`error` status. Marks errors as `isOperational` (expected) vs programmer bugs.
- **`asyncHandler`** — wraps an async controller so any thrown error is forwarded to Express's `next()` instead of crashing the process (avoids `try/catch` in every handler).
- **`errorHandler`** middleware — the single place that formats error responses, hiding stack traces in production (`NODE_ENV`).

> Note: this clean pattern (`AppError`/`asyncHandler`) is used in the **newer** code (auth). Some **older** controllers (applications, resumes, jobs) still use inline `try/catch` with `res.status(500)` — a visible sign of the codebase evolving. Worth mentioning honestly in an interview as "tech debt I'd unify."

### Auth middleware (`authMiddleware.js`)
Reads the `Authorization` header, strips the `Bearer ` prefix, verifies the JWT with the secret, and attaches `req.user = { id }`. Every protected route mounts this first (`router.use(authMiddleware)`).

---

## The Four Core Feature Flows

### A. Auth — register / login / JWT

**Register** (`POST /api/auth/register`):
1. Regex-validate the email.
2. Check the email isn't already taken.
3. `bcrypt.genSalt(10)` + `bcrypt.hash(password)` — never store plaintext.
4. Insert the user.

**Login** (`POST /api/auth/login`):
1. Look up by email; `bcrypt.compare` the password (constant-time-ish).
2. Sign a JWT: `jwt.sign({ user: { id } }, secret, { expiresIn: '7d' })`.
3. Return `{ token, user }`.
4. **Nice touch:** *after* responding, if the user has a Gmail token, it fires a background sync (`.catch()`ed) so the board is fresh when they land — without delaying the login response.

**On the frontend**, the token is stored in `localStorage`, injected into every axios call's `Authorization` header, and `ProtectedRoute` redirects to `/login` if it's missing.

### B. Application Tracking (Kanban)

- **Board** (`Dashboard.jsx`): four columns (`Applied/Interviewing/Offered/Rejected`). Cards are draggable via `@dnd-kit`. Dropping a card into a new column calls `handleStatusChange`, which:
  1. **Optimistically** updates local state immediately (snappy UX),
  2. fires `PUT /api/applications/:id`,
  3. **rolls back** by re-fetching if the request fails.
- Each column shows the first 5 cards with a "View All →" link to `ApplicationList.jsx` (a per-status filtered view).
- **Adding an application** (`addApplication`): if the user doesn't supply a link, the backend tries to **scrape a Google search result** (`googlethis`) for `"{company} {role} careers application"` and stores the first result URL — falling back to a plain Google search URL if scraping is blocked.
- **Ownership checks**: update/delete first `SELECT user_id` and return `403` if it doesn't match `req.user.id` — so users can't touch each other's rows.

### C. Gmail Auto-Sync (the "magic" feature)

This is the most impressive flow to walk an interviewer through.

**1. Connecting Gmail (OAuth2):**
```
ProfilePage "Connect Gmail" → GET /api/auth/google/url
  → backend builds an OAuth consent URL (scope: gmail.readonly,
    access_type=offline so we get a refresh token, state=userId)
  → user consents on Google → Google redirects to
    GET /api/auth/google/callback?code=...&state=userId
  → backend exchanges code for tokens, stores the refresh_token in users
  → kicks off an initial 30-day inbox scan in the background
  → redirects to /profile?gmail_connected=true
```
Only the **refresh token** is stored (long-lived); short-lived access tokens are minted on demand from it.

**2. The sync engine (`gmailService.js`)** — triggered by cron (every 5 min), on login, and manually:

- **Concurrency guard**: an in-memory `Set` of `activeSyncs` prevents two syncs for the same user overlapping (e.g. cron fires while a login-triggered sync is running).
- **Smart Gmail query** (`buildJobSearchQuery`): rather than reading the whole inbox, it builds a Gmail search that pre-filters to likely job emails — messages **from** known ATS domains (`greenhouse.io`, `lever.co`, `workday.com`, `naukri.com`…) **OR** with job-related **subject phrases** (`"application received"`, `"interview"`, `"unfortunately"`, `"online assessment"`…). This slashes the number of emails the LLM has to look at and cuts false positives.
- **Incremental / checkpointed**: it stores `last_gmail_sync_at` (unix seconds) and only fetches emails `after:` that (minus a 1-day overlap for safety). First-ever sync scans `newer_than:30d`.
- **Idempotent**: every processed message id goes in `processed_gmail_ids` (composite PK `user_id + message_id`). Before processing, it checks this table — so the same email is never double-counted, even across overlapping time windows.
- **MIME parsing**: recursively walks the email's MIME tree, preferring `text/plain`, falling back to HTML with tags stripped.
- **Rate-limit awareness**: `sleep(6500ms)` between LLM calls to stay under Gemini free-tier's ~10 requests/min.

**3. The classifier (`emailParser.js`):**
- Sends the email (from/subject/first 2500 chars) to **Gemini 2.5 Flash** with a **strict classification prompt**. The prompt enumerates exactly the 4 valid cases (Applied/Interviewing/Offered/Rejected) and a long list of INVALID cases (newsletters, recruiter cold-outreach, LinkedIn spam, password resets…) that must return `null`.
- Output is **forced to JSON** (`{company, role, status}` or the literal `null`), with markdown-fence stripping and `try/catch` JSON parsing.
- **Transient-error handling**: on a `429`/`503`/quota error it throws a flagged `isTransient` error. The caller then **does not** mark the email processed → it's retried next cycle instead of being silently lost.

**4. Applying the result:**
- Look for an existing application at that company (`ILIKE`).
  - If found and the status changed (or the role went from "Unknown Role" to real) → **update** it.
  - If not found → **insert** a new application (so an interview invite from a company you never manually logged still appears).
- On any change, **emit a WebSocket event** to that user's private room (`user_{id}`).

**5. Real-time UI:**
- `socketService.emitJobUpdate(userId, data)` sends only to `user_{id}`'s room → no cross-user leakage.
- The frontend `NotificationToast` joins its room on connect, shows a toast, and re-broadcasts a browser `CustomEvent` that the `Dashboard` listens for to live-update the board.

### D. Resume Vault + ATS Scoring

**Upload** (`POST /api/resumes`, `multer` single file):
- Only PDFs, ≤ 5MB, saved to `/uploads` with a unique timestamped filename.
- **Async scoring pattern** (important!):
  1. Insert the resume row immediately with `ats_score = -1` (pending).
  2. **Respond to the client instantly** — the user isn't blocked waiting on the AI.
  3. In a fire-and-forget async IIFE, run the ATS evaluation, then `UPDATE` the row with the real score/feedback. On failure, set `ats_score = 0` with an error message.
- The **frontend polls** `GET /api/resumes` every 3 s while any resume is `-1`, then stops. This is a simple, robust alternative to WebSockets for a one-off background job.

**The ATS scorer** (`utils/atsScorer.js` → `utils/ats_optimizer.py`):
- Node **spawns `python3 ats_optimizer.py`** as a child process, passing the resume path and a synthetic "job description" built from `target_role` + `academic_year`, and reads JSON off stdout.
- The Python script is a **hybrid scorer**:
  - **Rule-based layer** (deterministic, always runs): checks contact info, standard sections, bullet usage, **action-verb ratio**, **quantified-achievement ratio**, length, clichés ("responsible for", "team player"), date-format consistency, first-person pronouns, and weird characters — each worth a weighted number of points out of 100.
  - **AI layer** (Gemini, if `GEMINI_API_KEY` is set): returns a content-quality score, inferred role, suggested keywords, and bullet rewrites.
  - **Final score** = weighted blend (e.g. `0.45 * rules + 0.55 * AI` in general mode), minus a penalty for `.docx` structural issues (tables/images/text-boxes that break ATS parsers).
- Graceful degradation everywhere: if Python crashes, if the AI key is missing, if JSON fails to parse — it returns a safe fallback object rather than erroring the request.

**Starring a resume** uses `withTransaction` to atomically unstar all of a user's resumes and star exactly one — the starred resume becomes the default selection in the Job Finder.

### E. AI Job Finder

The crown-jewel feature. `POST /api/jobs/search` starts an **asynchronous multi-stage pipeline** (same "respond 202, work in background, poll for status" pattern as ATS scoring):

```
startSearch → insert job_searches row (status='running'), respond 202
            → runSearchPipeline() in the background:

 Stage 1  READ RESUME
   getResumeText(pdf) → extractProfile(resumeText, interests) via Gemini
   → { name, skills, target_roles, search_queries[], target_companies[] }

 Stage 2  FAN-OUT DISCOVERY  (jobSources.discoverJobs)
   For each of up to 6 search_queries, hit in parallel:
     • Remotive, Arbeitnow, Jobicy, The Muse, RemoteOK   (free aggregators)
     • Adzuna, JSearch/RapidAPI                          (optional, keyed)
     • Company career pages (careerPages.discoverCareerPageJobs):
         - Microsoft & Amazon official career APIs (searched per query)
         - ~25 KNOWN_BOARDS companies via their ATS API directly
           (Greenhouse/Lever/Ashby/SmartRecruiters/Workday)
         - NVIDIA Workday
         - Any user-named "dream companies" → probeCompany() guesses
           their ATS slug across all platforms
   All results normalized to a common shape, deduped by (title, company).

 Stage 3  RANK  (two-stage, cost-optimized)
   prefilterJobs()  → cheap LOCAL keyword scoring vs skills/roles,
                       keep top ~45  (avoids sending 100s of jobs to the LLM)
   rankJobs()       → Gemini scores the shortlist 0–100 with a one-line
                       "why this fits" summary, returns the best ≤15

 Stage 4  PERSIST (in a transaction)
   Delete previous status='new' matches, insert the fresh ranked batch,
   mark the search 'done' with stats (sources hit, counts, queries).
```

**Why two-stage ranking?** LLM calls are the expensive/slow part. A deterministic local pre-filter (keyword overlap on title/skills/description) cheaply throws out obviously-irrelevant jobs so the LLM only ranks ~45 plausible ones instead of hundreds. Classic **cheap-filter-then-expensive-model** pattern.

**Why hit company ATS APIs directly?** Aggregator boards mostly list remote/startup roles and miss big-company campus/new-grad postings. Greenhouse/Lever/Ashby/Workday all expose **public JSON board APIs** per company, so PlacePal pulls e.g. Stripe's or Anthropic's live openings straight from the source. For companies the user names that aren't pre-configured, `probeCompany()` guesses the slug (`"Acme Corp"` → `acmecorp`, `acme-corp`) and tries every ATS platform — whichever returns jobs wins.

**Per-opening AI actions** (generated on demand, then cached in the row):
- **Cover letter** (`POST /api/jobs/:id/cover-letter`): Gemini writes the content as JSON given the resume + job + the user's tone/points/motivation, and the backend assembles it into a **ready-to-compile LaTeX document** (with proper LaTeX escaping of special chars). The user copies/downloads the `.tex` and compiles in Overleaf.
- **Resume suggestions** (`POST /api/jobs/:id/suggestions`): Gemini returns a fit summary, missing keywords, targeted improvements, and before/after bullet rewrites tailored to that specific job.
- **Track** (`POST /api/jobs/:id/track`): copies the opening into the `applications` board as "Applied" and marks the match `tracked` — bridging discovery back into tracking.

**Resilience details:**
- Every external fetch has a 15 s timeout (`AbortController`) and a browser-like `User-Agent`.
- `Promise.allSettled` everywhere → one dead job board never fails the whole search.
- A `MAX_PER_COMPANY` cap stops one big board from flooding results.
- On server restart, `initDb` marks any `running` searches as `error` ("interrupted by a restart") so the UI doesn't spin forever.

---

## Frontend Deep Dive

- **Routing** (`App.jsx`): public routes (`/`, `/login`, `/register`) + a protected group wrapped in `<ProtectedRoute><DashboardLayout/></ProtectedRoute>`. `DashboardLayout` renders the top navbar + collapsible sidebar + an `<Outlet/>` for the active page.
- **API layer** (`src/api/*.js`): thin axios wrappers, one file per resource. Each injects the JWT from `localStorage` via a `getAuthHeaders()` helper. Keeps components free of URL/HTTP details.
- **State management**: intentionally **no Redux** — the app uses local `useState`/`useEffect` per page plus `localStorage` for the token/user. The data is page-scoped, so global state would be overkill.
- **Optimistic UI** throughout (Kanban drag, delete, star): update local state first, call the API, revert on failure. Makes the app feel instant.
- **Polling for background jobs**: Resumes poll while `ats_score === -1`; JobFinder polls `search/latest` every 3 s while `status === 'running'`. Simple and reliable for one-off async work.
- **WebSockets for push**: only the always-on Gmail sync uses Socket.IO, because those updates arrive unpredictably (whenever an email lands), so polling would be wasteful.
- **Env-based API URL**: `import.meta.env.VITE_API_URL` — Vite **bakes this into the bundle at build time**, so it must be set before `npm run build`. The socket URL is derived by stripping `/api` off it.

---

## Key Architectural Decisions & Trade-offs

| Decision | Why | Trade-off / honest caveat |
|---|---|---|
| **"Respond immediately, process in background"** for ATS + Job search | Keeps the API responsive; long AI work doesn't block the HTTP request | Background work is in-process — a server restart mid-job loses it (mitigated: searches get marked `error` on boot) |
| **Poll for job status, WebSocket for email updates** | Polling is trivially reliable for one-off jobs; push suits unpredictable email arrivals | Two mechanisms instead of one |
| **Gemini free-tier** → 6.5 s sleep between calls | Free for a student project | Serial email processing is slow at scale; a paid tier + a real queue (BullMQ/Redis) would fix it |
| **Store resume PDFs on local disk** | Simplest thing that works | Needs a persistent volume in prod; doesn't scale to multiple instances (should move to S3/R2) |
| **JWT in `localStorage`** | Easy, stateless | Vulnerable to XSS token theft; httpOnly cookies would be more secure |
| **Refresh tokens stored unencrypted** | Fine for a personal project | Must encrypt at rest before onboarding real users (noted in DEPLOY.md) |
| **Hitting company ATS APIs directly** | Far better coverage of big-company roles than aggregators | Undocumented endpoints/slugs can break; handled with allSettled + graceful skips |
| **Python child process for ATS rules** | Clean text-processing, decoupled | Requires Python in the runtime image (handled in the Dockerfile) |
| **Auto-migrations in `initDb`** | No migration tool needed for a small project | Not as robust as a real migration framework for complex schema changes |

---

## Security

- **Passwords**: bcrypt-hashed with a per-password salt.
- **Auth**: JWT (7-day expiry), verified on every protected route.
- **Ownership checks**: controllers verify `user_id` before mutating rows (no IDOR).
- **Rate limiting**: general 600/15 min, auth 30/15 min, AI 60/hr.
- **CORS**: restricted to configured `FRONTEND_URL`/`ALLOWED_ORIGINS`.
- **Helmet**: security headers (with `crossOriginResourcePolicy` relaxed so the frontend can load `/uploads` PDFs cross-origin).
- **Input caps**: JSON body limited to 1 MB; uploads limited to 5 MB PDFs only.
- **WebSocket isolation**: users only receive events in their own `user_{id}` room.
- **Secrets**: all via env vars; `.env` and `uploads/` are gitignored.

Known items to harden before real users (from `DEPLOY.md`): encrypt Google refresh tokens at rest; consider httpOnly-cookie auth; move uploads off local disk.

---

## Running Locally

### Prerequisites
- Node.js 20+, npm
- PostgreSQL running locally (or a managed URL)
- Python 3 (for ATS scoring)
- A [Gemini API key](https://aistudio.google.com/apikey) (free)
- (Optional) Google Cloud OAuth credentials for the Gmail feature

### Backend
```bash
cd backend
cp .env.example .env          # then fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY…
npm install
npm run dev                   # nodemon; tables auto-create on first boot
# → Server running on port 8000
```
Optional Python deps for richer ATS analysis (the script runs without them too):
```bash
pip install python-docx PyPDF2 scikit-learn --break-system-packages
```

### Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev                   # Vite dev server → http://localhost:5173
```

### Gmail OAuth (optional, for auto-sync)
1. In Google Cloud Console, create OAuth credentials, enable the Gmail API.
2. Add redirect URI `http://localhost:8000/api/auth/google/callback`.
3. Put `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REDIRECT_URI` in `backend/.env`.
4. In the app: Profile → Connect Gmail.

---

## Deployment

See **`DEPLOY.md`** for the full runbook. Summary:

- **Backend** → an always-on host (Render / Railway / Fly.io) using the included **Dockerfile** (Node 20 + Python 3). It is **not serverless-compatible** (background cron, WebSockets, child processes). Attach a **persistent volume at `/app/uploads`** or resume PDFs vanish on redeploy. Provision managed Postgres and set `DATABASE_URL` (SSL auto-detected; tables/migrations run on boot).
- **Frontend** → any static host (Vercel / Netlify). `npm run build` → `dist/`. Set `VITE_API_URL` **at build time**. Add an SPA rewrite so all routes serve `index.html`.

---

## Environment Variables

### Backend (`backend/.env`)
| Var | Purpose |
|---|---|
| `PORT` | API port (default 8000) |
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | Override SSL auto-detection (`true`/`false`) |
| `JWT_SECRET` | Secret for signing JWTs (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | Google Gemini key (email parsing, job AI, ATS) |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REDIRECT_URI` | Gmail OAuth |
| `FRONTEND_URL` | Frontend origin (CORS, Socket.IO, OAuth redirects) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` / `ADZUNA_COUNTRY` | *(optional)* wider job coverage |
| `RAPIDAPI_KEY` | *(optional)* JSearch aggregator |

### Frontend (`frontend/.env`)
| Var | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base, e.g. `http://localhost:8000/api` (baked in at build time) |

---

## Interview Cheat-Sheet — Likely Questions & Answers

**Q: Walk me through what happens when a rejection email hits my inbox.**
A cron job (every 5 min) calls `fetchAndProcessEmails`. For each Gmail-connected user it runs a checkpointed, deduped Gmail search pre-filtered to likely job emails. Each new message's text goes to Gemini with a strict classifier prompt that returns `{company, role, status}` or `null`. A "Rejected" result finds the matching application (by company, `ILIKE`) and updates its status, then emits a Socket.IO event to that user's private room, which pops a toast and live-updates the Kanban board.

**Q: Why Postgres and not MongoDB?**
The data is relational with real foreign-key relationships and cascade semantics (delete a user → delete their applications/resumes/matches). Postgres enforces that integrity. For the few semi-structured fields (AI feedback, match stats) I use JSONB columns, so I still get schema-less flexibility where I need it — without a second database.

**Q: How do you keep AI costs/latency down in the Job Finder?**
Two-stage ranking. First a cheap deterministic keyword pre-filter narrows hundreds of scraped jobs to ~45, then the LLM only ranks that shortlist. I also cache generated cover letters/suggestions in the row so they're not regenerated.

**Q: How is the app secured?**
bcrypt-hashed passwords, JWT auth verified per route, per-row ownership checks (no IDOR), tiered rate limiting, CORS allowlist, Helmet headers, input size caps, and per-user WebSocket rooms.

**Q: What's the async pattern you keep reusing?**
"Respond immediately, work in the background, let the client poll." Resume upload inserts a `-1` pending score and returns instantly; the ATS runs after. Job search returns `202` with a `running` row and runs the pipeline after. The frontend polls until the status flips. It keeps the API responsive without blocking on slow AI work.

**Q: What would you improve with more time?**
Move background work to a real job queue (BullMQ/Redis) so restarts don't lose it and Gmail parsing can parallelize; move resume storage to S3/R2; encrypt OAuth refresh tokens at rest; switch JWT to httpOnly cookies; and unify the older inline `try/catch` controllers onto the newer `AppError`/`asyncHandler` pattern.

---

*Built as a full-stack portfolio project demonstrating REST API design, relational data modeling, real-time WebSockets, OAuth2 integration, LLM application patterns, and a polished React SPA.*
