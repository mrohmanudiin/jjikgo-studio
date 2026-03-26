const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const env = require('./env');
const schema = require('../db/schema');

/**
 * Build postgres driver config based on the connection URL.
 * PgBouncer in transaction mode does not support prepared statements,
 * and serverless functions should use max: 1 to avoid connection exhaustion.
 */
function buildPostgresConfig(url) {
  const isPgBouncer = typeof url === 'string' && url.includes('pgbouncer=true');
  return {
    prepare: !isPgBouncer,
    max: isPgBouncer ? 1 : 10,
  };
}

let queryClient;
let db;

if (env.DATABASE_URL) {
  const config = buildPostgresConfig(env.DATABASE_URL);
  queryClient = postgres(env.DATABASE_URL, config);
  db = drizzle(queryClient, { schema });
} else {
  console.error('❌ Cannot initialize Database: DATABASE_URL is missing.');
  db = {
    query: new Proxy({}, { get: () => { throw new Error('Database not initialized'); } }),
    insert: () => { throw new Error('Database not initialized'); },
    select: () => { throw new Error('Database not initialized'); },
    update: () => { throw new Error('Database not initialized'); },
    delete: () => { throw new Error('Database not initialized'); },
  };
}

module.exports = { db, queryClient, buildPostgresConfig };
