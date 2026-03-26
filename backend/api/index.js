// Vercel serverless entry point
// Exports the Express app — Vercel wraps it in its own HTTP layer
const app = require('../src/app');
module.exports = app;
