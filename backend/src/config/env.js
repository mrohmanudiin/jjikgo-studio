require('dotenv').config();

// Validate required env vars
const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL (or DB_URL) is required');
  console.error('Available Environment Variables:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASS')));
  process.exit(1);
}

const env = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: dbUrl,
  JWT_SECRET: process.env.JWT_SECRET || 'jjikgo-super-secret-key-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URLS: (process.env.FRONTEND_URLS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(','),
};

module.exports = env;
