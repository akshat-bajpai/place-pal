# Deploying PlacePal

## Architecture
- **Backend** — Express + Socket.io + Postgres, needs an always-on host (background jobs: ATS scoring, Gmail sync cron, job discovery). Not serverless-compatible.
- **Frontend** — static Vite build; any static host works.

## Backend (Render / Railway / Fly.io)
1. Deploy `backend/` with the included `Dockerfile` (bundles Node 20 + Python 3 for the ATS scorer).
2. Provision managed Postgres and set `DATABASE_URL`. SSL is auto-detected; tables and migrations run automatically on boot.
3. Attach a **persistent volume** at `/app/uploads` — resume PDFs are stored on disk and vanish on redeploy otherwise. (Or migrate storage to S3/R2 later.)
4. Set environment variables (see `backend/.env.example`):
   - `JWT_SECRET` — generate fresh: `openssl rand -hex 32`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` — your deployed frontend origin (CORS + Socket.io + OAuth redirects)
   - `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REDIRECT_URI` — add the production
     redirect URI (`https://<api-host>/api/auth/google/callback`) in Google Cloud Console
   - Optional: `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`/`RAPIDAPI_KEY` for wider Job Finder coverage

## Frontend (Vercel / Netlify)
1. Build `frontend/` with `npm run build` (output: `dist/`).
2. Set `VITE_API_URL=https://<api-host>/api` **at build time** (Vite bakes it into the bundle).
3. Add an SPA rewrite so all routes serve `index.html` (Vercel: automatic for Vite; Netlify: `/* /index.html 200`).

## Security notes
- Rate limiting is enabled: 600 req/15min general, 30/15min on auth, 60/hr on AI (job search / cover letter / suggestions) endpoints.
- CORS is restricted to `FRONTEND_URL`.
- Google OAuth refresh tokens are stored unencrypted in Postgres — fine for personal use; encrypt at rest before onboarding real users.
- Resume uploads are user PII: keep `uploads/` out of git (already ignored) and off public buckets.
