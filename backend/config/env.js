require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL,
  jwtSecret: process.env.JWT_SECRET || (isProd ? undefined : 'dev-only-insecure-secret'),
  geminiApiKey: process.env.GEMINI_API_KEY,
  gmailClientId: process.env.GMAIL_CLIENT_ID,
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Browsers send the Origin header without a trailing slash, so normalize
  // configured origins (trim whitespace + strip trailing slash) to avoid a
  // silent CORS mismatch when an env var has a stray slash.
  allowedOrigins: (process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [process.env.FRONTEND_URL || 'http://localhost:5173']
  ).map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
};

// Fail fast on missing/insecure config rather than booting a broken or unsafe server.
const validateEnv = () => {
  const errors = [];

  if (!env.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }
  if (!process.env.JWT_SECRET) {
    if (isProd) {
      errors.push('JWT_SECRET is required in production (generate with: openssl rand -hex 32)');
    } else {
      console.warn('[env] JWT_SECRET not set — using an insecure development fallback.');
    }
  } else if (env.jwtSecret.length < 32 && isProd) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }
  if (!env.geminiApiKey) {
    console.warn('[env] GEMINI_API_KEY not set — AI features (resume/job matching) will fail.');
  }

  if (errors.length > 0) {
    console.error('Invalid environment configuration:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
};

env.validateEnv = validateEnv;

module.exports = env;
