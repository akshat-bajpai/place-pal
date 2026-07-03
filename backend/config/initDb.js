const db = require('./db');

const initDb = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                education JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Applied',
                link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS resumes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                version_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                is_starred BOOLEAN DEFAULT FALSE,
                target_role VARCHAR(255),
                academic_year VARCHAR(50),
                ats_score INTEGER DEFAULT 0,
                ats_feedback JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS processed_gmail_ids (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                gmail_message_id VARCHAR(255) NOT NULL,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, gmail_message_id)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS job_searches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
                interests TEXT,
                status VARCHAR(20) DEFAULT 'running',
                stats JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS job_matches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                search_id INTEGER REFERENCES job_searches(id) ON DELETE SET NULL,
                resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
                title VARCHAR(500) NOT NULL,
                company VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                url TEXT NOT NULL,
                source VARCHAR(100),
                description TEXT,
                tags JSONB,
                match_score INTEGER,
                match_summary TEXT,
                resume_suggestions JSONB,
                cover_letter TEXT,
                status VARCHAR(20) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Auto-migrations for existing tables
        const migrations = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_gmail_sync_at BIGINT DEFAULT 0`,
            `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS target_role VARCHAR(255) DEFAULT 'General'`,
            `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '3rd Year'`,
            `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_score INTEGER DEFAULT 0`,
            `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_feedback JSONB`,
            `ALTER TABLE job_searches ADD COLUMN IF NOT EXISTS target_companies TEXT`,
        ];

        for (const sql of migrations) {
            try {
                await db.query(sql);
            } catch (err) {
                // Column already exists or similar — safe to ignore
            }
        }

        console.log('PostgreSQL: All tables ready.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

module.exports = initDb;
