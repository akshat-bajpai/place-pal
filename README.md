# PlacePal — AI-Powered Job Application Tracker & Discovery Platform

PlacePal is a full-stack web app that helps students and job-seekers **manage their entire job hunt in one place**. It does four big things:

1. **Tracks applications** on a drag-and-drop Kanban board (Applied → Interviewing → Offered → Rejected).
2. **Auto-updates that board from your Gmail** — it reads your inbox, uses an LLM to detect "we received your application" / "you're invited to interview" / "unfortunately…" emails, and moves the right card automatically.
3. **Scores your resume** for ATS (Applicant Tracking System) friendliness using a hybrid rules-engine + Gemini AI pipeline.
4. **Finds jobs for you** — an AI reads your resume, fans out across ~10 job boards *and* company career pages (Greenhouse, Lever, Ashby, Workday, Microsoft, Amazon…), ranks the openings against your profile, and generates tailored cover letters and resume-improvement tips.


---


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

