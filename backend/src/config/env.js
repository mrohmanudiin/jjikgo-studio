require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;

if (!dbUrl) {
  console.warn('⚠️  DATABASE_URL is missing! The app will fail on database queries.');
}

const env = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: dbUrl,
  JWT_SECRET: process.env.JWT_SECRET || 'jjikgo-super-secret-key-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URLS: (process.env.FRONTEND_URLS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(','),
};

module.exports = env;
