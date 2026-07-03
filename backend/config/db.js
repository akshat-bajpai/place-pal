const { Pool } = require('pg');
require('dotenv').config();

// Managed Postgres (Render/Neon/Supabase/Railway) requires SSL; local dev does not.
// Auto-detect from the connection string, override with DATABASE_SSL=true/false.
const connectionString = process.env.DATABASE_URL || '';
const useSsl = process.env.DATABASE_SSL !== undefined
  ? process.env.DATABASE_SSL !== 'false'
  : !/localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),

  // Run fn inside a real transaction on a single dedicated connection.
  // BEGIN/COMMIT through pool.query() is unsafe: each statement may land on a
  // different pooled connection under concurrency.
  withTransaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
